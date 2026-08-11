import fs from 'fs';
import path from 'path';
import { openWorldDb } from '../db.mjs';
import { slugify } from '../slug.mjs';

// Quebra o blob `entries` de um compendium_packs num arquivo .json por
// entry (nome = slug-do-nome--idcurto.json), pra dar diff decente no git.
// Espelha o problema real: hoje um pack inteiro é uma linha só no banco
// do world (worlds/<worldId>/world.sqlite).
export function run(positional, flags) {
  const [worldId, packId] = positional;
  if (!worldId || !packId) {
    console.error('Uso: loom compendium:unpack <worldId> <packId> [--out <dir>]');
    process.exitCode = 1;
    return;
  }

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true });
  let pack;
  try {
    pack = db.prepare(`SELECT id, name, type, entries FROM compendium_packs WHERE id = ?`).get(packId);
  } finally {
    db.close();
  }

  if (!pack) {
    console.error(`Pack ${packId} não encontrado em ${dbPath}.`);
    process.exitCode = 1;
    return;
  }

  const outDir = path.resolve(flags.out || path.join('.', 'packs', slugify(pack.name)));
  fs.mkdirSync(outDir, { recursive: true });

  const entries = JSON.parse(pack.entries || '[]');
  for (const entry of entries) {
    const base = slugify(entry.name);
    const shortId = String(entry.id || '').slice(0, 8);
    const fileName = `${base}--${shortId}.json`;
    fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(entry, null, 2) + '\n', 'utf-8');
  }

  const metaPath = path.join(outDir, '_pack.json');
  fs.writeFileSync(metaPath, JSON.stringify({ id: pack.id, worldId, name: pack.name, type: pack.type }, null, 2) + '\n', 'utf-8');

  console.log(`${entries.length} entries de "${pack.name}" gravadas em ${outDir}`);
}
