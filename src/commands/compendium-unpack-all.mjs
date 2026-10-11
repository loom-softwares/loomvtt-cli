import fs from 'fs';
import path from 'path';
import { openWorldDb } from '../db.mjs';
import { slugify } from '../slug.mjs';

export function run(positional, flags) {
  const [worldId] = positional;
  if (!worldId) {
    console.error('Uso: loom compendium:unpack-all <worldId> [--out <dir>]');
    process.exitCode = 1;
    return;
  }

  const baseOut = path.resolve(flags.out || './packs');
  fs.mkdirSync(baseOut, { recursive: true });

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true });
  let packs = [];
  try {
    packs = db.prepare('SELECT id, name, type, entries FROM compendium_packs').all();
  } finally {
    db.close();
  }

  if (packs.length === 0) {
    console.log(`Nenhum compendium pack encontrado no mundo ${worldId}.`);
    return;
  }

  console.log(`Desempacotando ${packs.length} pack(s) para ${baseOut}...`);
  let totalEntries = 0;

  for (const pack of packs) {
    const packSlug = slugify(pack.name || pack.id);
    const packDir = path.join(baseOut, packSlug);
    fs.mkdirSync(packDir, { recursive: true });

    let entries = [];
    try {
      entries = JSON.parse(pack.entries || '[]');
    } catch {
      entries = [];
    }

    for (const entry of entries) {
      const base = slugify(entry.name || 'entry');
      const shortId = String(entry.id || '').slice(0, 8);
      const fileName = `${base}--${shortId}.json`;
      fs.writeFileSync(path.join(packDir, fileName), JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    }

    const metaPath = path.join(packDir, '_pack.json');
    fs.writeFileSync(metaPath, JSON.stringify({ id: pack.id, worldId, name: pack.name, type: pack.type }, null, 2) + '\n', 'utf-8');

    console.log(`  [✓] ${pack.name}: ${entries.length} entries -> ${path.relative(process.cwd(), packDir)}`);
    totalEntries += entries.length;
  }

  console.log(`\nConcluído! Total de ${totalEntries} entries desempacotadas em ${packs.length} pastas.`);
}
