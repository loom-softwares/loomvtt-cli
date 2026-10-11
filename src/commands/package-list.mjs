import fs from 'fs';
import path from 'path';
import { resolveDataRoot, openDb } from '../db.mjs';

function readManifest(dir) {
  for (const name of ['ruleset.json', 'system.json', 'addon.json', 'module.json']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try {
        return { manifest: JSON.parse(fs.readFileSync(p, 'utf-8')), manifestFile: name };
      } catch {
        return { manifest: null, manifestFile: name };
      }
    }
  }
  return { manifest: null, manifestFile: null };
}

export function run(positional, flags) {
  const dataRoot = resolveDataRoot({ env: flags.env, dataRoot: flags['data-root'] });
  console.log(`\n=== Pacotes LoomVTT (${dataRoot}) ===\n`);

  const list = [];

  // 1. Rulesets em marketplace/rulesets
  const rulesetsDir = path.join(dataRoot, 'marketplace', 'rulesets');
  if (fs.existsSync(rulesetsDir)) {
    const entries = fs.readdirSync(rulesetsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const fullPath = path.join(rulesetsDir, entry.name);
      const isSymlink = fs.lstatSync(fullPath).isSymbolicLink();
      const { manifest } = readManifest(fullPath);

      list.push({
        ID: entry.name,
        Tipo: 'Ruleset (Sistema)',
        Título: manifest?.title || manifest?.name || entry.name,
        Versão: manifest?.version || '1.0.0',
        DevLink: isSymlink ? 'Sim (Symlink)' : 'Não'
      });
    }
  }

  // 2. Addons em marketplace/addons
  const addonsDir = path.join(dataRoot, 'marketplace', 'addons');
  if (fs.existsSync(addonsDir)) {
    const entries = fs.readdirSync(addonsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const fullPath = path.join(addonsDir, entry.name);
      const isSymlink = fs.lstatSync(fullPath).isSymbolicLink();
      const { manifest } = readManifest(fullPath);

      list.push({
        ID: entry.name,
        Tipo: 'Addon',
        Título: manifest?.title || manifest?.name || entry.name,
        Versão: manifest?.version || '1.0.0',
        DevLink: isSymlink ? 'Sim (Symlink)' : 'Não'
      });
    }
  }

  // 3. Pacotes no banco rpg-core.sqlite
  try {
    const { db } = openDb({ env: flags.env, dataRoot: flags['data-root'], readonly: true });
    const dbPackages = db.prepare('SELECT id, name, type, version, isActive FROM packages').all();
    db.close();

    for (const pkg of dbPackages) {
      // Se não foi listado fisicamente acima, adiciona
      if (!list.some(item => item.ID === pkg.id)) {
        list.push({
          ID: pkg.id,
          Tipo: `DB (${pkg.type})`,
          Título: pkg.name,
          Versão: pkg.version || 'N/A',
          DevLink: 'Banco'
        });
      }
    }
  } catch {
    // Ignora se banco não estiver acessível
  }

  if (list.length === 0) {
    console.log('Nenhum pacote encontrado em marketplace/ ou no banco.');
  } else {
    console.table(list);
    console.log(`\nTotal: ${list.length} pacote(s)`);
  }
}
