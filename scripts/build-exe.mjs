import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import esbuild from 'esbuild';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
fs.mkdirSync(distDir, { recursive: true });

console.log('1. Gerando bundle completo do CLI com esbuild...');
const bundleFile = path.join(distDir, 'bundle.cjs');

const bindingsShimPlugin = {
  name: 'bindings-shim',
  setup(build) {
    build.onResolve({ filter: /^bindings$/ }, args => {
      return { path: args.path, namespace: 'bindings-ns' };
    });
    build.onLoad({ filter: /.*/, namespace: 'bindings-ns' }, () => {
      return {
        contents: `
const fs = require('fs');
const path = require('path');
module.exports = function() {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(exeDir, 'better_sqlite3.node'),
    path.join(process.cwd(), 'better_sqlite3.node'),
    path.join(exeDir, 'build', 'Release', 'better_sqlite3.node'),
    path.join(exeDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const m = { exports: {} };
      process.dlopen(m, c);
      return m.exports;
    }
  }
  throw new Error('better_sqlite3.node não encontrado ao lado de ' + exeDir);
};
        `,
        loader: 'js'
      };
    });
  }
};

await esbuild.build({
  entryPoints: [path.join(rootDir, 'bin', 'loom.mjs')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: bundleFile,
  plugins: [bindingsShimPlugin]
});

console.log('2. Gerando configuração e blob do Node SEA...');
const seaConfig = path.join(distDir, 'sea-config.json');
const seaBlob = path.join(distDir, 'sea-prep.blob');

fs.writeFileSync(seaConfig, JSON.stringify({
  main: bundleFile,
  output: seaBlob,
  disableExperimentalSEAWarning: true
}, null, 2));

execSync(`node --experimental-sea-config "${seaConfig}"`, { stdio: 'inherit' });

console.log('3. Criando binário loom-cli.exe...');
const targetExe = path.join(distDir, 'loom-cli.exe');
fs.copyFileSync(process.execPath, targetExe);

console.log('4. Injetando blob no executável com postject...');
execSync(`npx postject "${targetExe}" NODE_SEA_BLOB "${seaBlob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite`, { stdio: 'inherit' });

console.log('5. Copiando better_sqlite3.node para dist/ ...');
const nodeAddonSrc = path.join(rootDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const nodeAddonDest = path.join(distDir, 'better_sqlite3.node');
fs.copyFileSync(nodeAddonSrc, nodeAddonDest);

// Limpeza de arquivos intermediários do build
if (fs.existsSync(seaConfig)) fs.unlinkSync(seaConfig);
if (fs.existsSync(seaBlob)) fs.unlinkSync(seaBlob);
if (fs.existsSync(bundleFile)) fs.unlinkSync(bundleFile);
const oldNodeModules = path.join(distDir, 'node_modules');
if (fs.existsSync(oldNodeModules)) fs.rmSync(oldNodeModules, { recursive: true, force: true });

console.log(`\n[✓] Sucesso! Executável e dependência gerados em ${distDir}:`);
console.log(`  - loom-cli.exe`);
console.log(`  - better_sqlite3.node`);
