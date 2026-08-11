import { openWorldDb } from '../db.mjs';

export function run(positional, flags) {
  const worldId = positional[0];
  if (!worldId) {
    console.error('Uso: loom compendium:list <worldId>');
    process.exitCode = 1;
    return;
  }

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true });
  try {
    const rows = db.prepare(`SELECT id, name, type, entries FROM compendium_packs`).all();
    if (rows.length === 0) {
      console.log(`Nenhum pack encontrado (${dbPath}).`);
      return;
    }
    console.log(`Compendium packs em ${dbPath}:\n`);
    for (const p of rows) {
      const count = JSON.parse(p.entries || '[]').length;
      console.log(`${p.id}  ${p.name}  [${p.type}]  entries=${count}`);
    }
  } finally {
    db.close();
  }
}
