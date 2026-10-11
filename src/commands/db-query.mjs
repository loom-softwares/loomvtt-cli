import { openDb, openWorldDb } from '../db.mjs';

export function run(positional, flags) {
  const sql = positional.join(' ').trim();
  if (!sql) {
    console.error('Uso: loom db:query "<SQL>" [--world <worldId>] [--json]');
    process.exitCode = 1;
    return;
  }

  const isWorld = Boolean(flags.world);
  const targetDesc = isWorld ? `world "${flags.world}"` : 'rpg-core.sqlite';
  const { db, dbPath } = isWorld
    ? openWorldDb(flags.world, { env: flags.env, dataRoot: flags['data-root'] })
    : openDb({ env: flags.env, dataRoot: flags['data-root'] });

  try {
    const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)/i.test(sql);
    const stmt = db.prepare(sql);

    if (isSelect) {
      const rows = stmt.all();
      if (flags.json) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        if (rows.length === 0) {
          console.log(`Nenhum resultado retornado de ${targetDesc}.`);
        } else {
          console.table(rows);
          console.log(`\n(${rows.length} linha(s) retornada(s))`);
        }
      }
    } else {
      const result = stmt.run();
      console.log(`Executado em ${targetDesc} (${dbPath}):`);
      console.log(`  Alterações: ${result.changes}`);
      if (result.lastInsertRowid) {
        console.log(`  Último ID inserido: ${result.lastInsertRowid}`);
      }
    }
  } finally {
    db.close();
  }
}
