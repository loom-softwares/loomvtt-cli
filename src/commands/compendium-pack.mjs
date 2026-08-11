import fs from 'fs';
import path from 'path';
import { openWorldDb } from '../db.mjs';

// Inverso do unpack: lê os .json soltos de uma pasta e reconstrói o blob
// `entries`, gravando direto no compendium_packs do world (sem passar pelo
// servidor — é ferramenta de dev, roda com o servidor desligado).
export function run(positional, flags) {
  const [worldId, dir] = positional;
  if (!worldId || !dir) {
    console.error('Uso: loom compendium:pack <worldId> <dir> [--into <packId>]');
    process.exitCode = 1;
    return;
  }

  const dirPath = path.resolve(dir);
  if (!fs.existsSync(dirPath)) {
    console.error(`Pasta não encontrada: ${dirPath}`);
    process.exitCode = 1;
    return;
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json') && f !== '_pack.json');
  const entries = files.map(f => JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf-8')));

  const metaPath = path.join(dirPath, '_pack.json');
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : {};
  const packId = flags.into || meta.id;

  if (!packId) {
    console.error('Sem --into <packId> e sem _pack.json com id salvo — não sei em qual pack gravar.');
    process.exitCode = 1;
    return;
  }

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'] });
  try {
    const existing = db.prepare(`SELECT id FROM compendium_packs WHERE id = ?`).get(packId);
    if (!existing) {
      console.error(`Pack ${packId} não existe em ${dbPath} — crie o pack antes (pela UI) ou passe --into um id existente.`);
      process.exitCode = 1;
      return;
    }
    db.prepare(`UPDATE compendium_packs SET entries = ?, updatedAt = ? WHERE id = ?`)
      .run(JSON.stringify(entries), new Date().toISOString(), packId);
    console.log(`${entries.length} entries gravadas no pack ${packId} (${dbPath}).`);
  } finally {
    db.close();
  }
}
