import fs from 'fs';
import path from 'path';
import { resolveDataRoot, openDb } from '../db.mjs';

export function run(positional, flags) {
  const [pkgId] = positional;
  if (!pkgId) {
    console.error('Uso: loom package:unlink <nome-ou-id>');
    process.exitCode = 1;
    return;
  }

  const dataRoot = resolveDataRoot({ env: flags.env, dataRoot: flags['data-root'] });
  const candidates = [
    path.join(dataRoot, 'marketplace', 'rulesets', pkgId),
    path.join(dataRoot, 'marketplace', 'addons', pkgId)
  ];

  let foundPath = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      foundPath = c;
      break;
    }
  }

  if (!foundPath) {
    console.error(`Pacote "${pkgId}" não encontrado em marketplace/rulesets ou marketplace/addons.`);
    process.exitCode = 1;
    return;
  }

  const stat = fs.lstatSync(foundPath);
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(foundPath);
    console.log(`[✓] Link simbólico removido: ${foundPath}`);
  } else if (flags.force) {
    fs.rmSync(foundPath, { recursive: true, force: true });
    console.log(`[✓] Diretório removido (--force): ${foundPath}`);
  } else {
    console.error(`"${foundPath}" é um diretório real e não um link simbólico. Use --force para remover fisicamente.`);
    process.exitCode = 1;
    return;
  }

  try {
    const { db } = openDb({ env: flags.env, dataRoot: flags['data-root'] });
    db.prepare('UPDATE packages SET isActive = 0 WHERE id = ?').run(pkgId);
    db.close();
    console.log(`[✓] Pacote desativado no rpg-core.sqlite`);
  } catch {
    // Ignora se banco não acessível
  }
}
