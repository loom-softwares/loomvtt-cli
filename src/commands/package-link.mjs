import fs from 'fs';
import path from 'path';
import { resolveDataRoot, openDb } from '../db.mjs';

function readPackageManifest(dir) {
  for (const name of ['ruleset.json', 'system.json', 'addon.json']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(p, 'utf-8'));
        const type = (name.startsWith('ruleset') || name.startsWith('system') || manifest.type === 'ruleset')
          ? 'ruleset'
          : 'addon';
        return { manifest, manifestFile: name, type };
      } catch (e) {
        throw new Error(`Erro ao ler ${name}: ${e.message}`);
      }
    }
  }
  return null;
}

export function run(positional, flags) {
  const targetPath = path.resolve(positional[0] || '.');
  if (!fs.existsSync(targetPath)) {
    console.error(`Caminho não encontrado: ${targetPath}`);
    process.exitCode = 1;
    return;
  }

  const pkgInfo = readPackageManifest(targetPath);
  if (!pkgInfo) {
    console.error(`Nenhum manifesto (ruleset.json, system.json ou addon.json) encontrado em ${targetPath}.`);
    process.exitCode = 1;
    return;
  }

  const { manifest, type } = pkgInfo;
  const pkgId = manifest.name || path.basename(targetPath);
  const dataRoot = resolveDataRoot({ env: flags.env, dataRoot: flags['data-root'] });

  const destDir = path.join(dataRoot, 'marketplace', type === 'ruleset' ? 'rulesets' : 'addons');
  fs.mkdirSync(destDir, { recursive: true });

  const linkPath = path.join(destDir, pkgId);

  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(linkPath);
    } else if (flags.force) {
      fs.rmSync(linkPath, { recursive: true, force: true });
    } else {
      console.error(`Já existe uma pasta ou link em ${linkPath}. Use --force para sobrescrever.`);
      process.exitCode = 1;
      return;
    }
  }

  // No Windows usamos 'junction' para não exigir privilégios de Administrador
  const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(targetPath, linkPath, symlinkType);
  console.log(`[✓] Link simbólico criado:`);
  console.log(`    De:   ${targetPath}`);
  console.log(`    Para: ${linkPath}`);

  // Opcionalmente atualiza o registro na tabela packages do rpg-core.sqlite
  try {
    const { db } = openDb({ env: flags.env, dataRoot: flags['data-root'] });
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM packages WHERE id = ?').get(pkgId);

    if (existing) {
      db.prepare('UPDATE packages SET isActive = 1, updatedAt = ? WHERE id = ?').run(now, pkgId);
    } else {
      db.prepare(`
        INSERT INTO packages (
          id, name, type, version, description, manifest, author, authorUrl,
          license, url, downloadUrl, downloadCount, isCompatible, minVersion,
          maxVersion, compatibility, isActive, installedAt, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, '', '',
          '', '', '', 0, 1, '0.0.0',
          '999.999.999', '1.0.0', 1, ?, ?, ?
        )
      `).run(
        pkgId,
        manifest.title || manifest.name || pkgId,
        type,
        manifest.version || '1.0.0',
        manifest.description || '',
        JSON.stringify(manifest),
        now, now, now
      );
    }
    db.close();
    console.log(`[✓] Pacote registrado/ativado no rpg-core.sqlite`);
  } catch (err) {
    console.log(`[!] Aviso ao registrar no banco: ${err.message}`);
  }

  console.log(`\nPacote pronto para desenvolvimento com recarregamento em tempo real no LoomVTT!`);
}
