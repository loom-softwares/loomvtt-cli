import fs from 'fs';
import { openDb, openWorldDb } from '../db.mjs';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function run(positional, flags) {
  const worldId = flags.world || positional[0];
  const isWorld = Boolean(worldId);
  const targetDesc = isWorld ? `World "${worldId}"` : 'Banco central (rpg-core.sqlite)';

  const { db, dbPath } = isWorld
    ? openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true })
    : openDb({ env: flags.env, dataRoot: flags['data-root'], readonly: true });

  try {
    const stats = fs.statSync(dbPath);
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();

    console.log(`\n=== Estatísticas de ${targetDesc} ===`);
    console.log(`Arquivo: ${dbPath}`);
    console.log(`Tamanho em disco: ${formatBytes(stats.size)}`);

    const pageCount = db.prepare('PRAGMA page_count').get()?.page_count;
    const pageSize = db.prepare('PRAGMA page_size').get()?.page_size;
    if (pageCount && pageSize) {
      console.log(`Páginas: ${pageCount} (tamanho de página: ${pageSize} bytes)`);
    }

    console.log(`\nTabelas e contagem de registros:`);
    const tableCounts = [];
    for (const { name } of tables) {
      try {
        const count = db.prepare(`SELECT count(*) as c FROM "${name}"`).get()?.c ?? 0;
        tableCounts.push({ Tabela: name, Registros: count });
      } catch {
        tableCounts.push({ Tabela: name, Registros: 'N/A' });
      }
    }
    tableCounts.sort((a, b) => (typeof b.Registros === 'number' ? b.Registros : -1) - (typeof a.Registros === 'number' ? a.Registros : -1));
    console.table(tableCounts);
  } finally {
    db.close();
  }
}
