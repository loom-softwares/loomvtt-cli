import { openWorldDb } from '../db.mjs';

export function run(positional, flags) {
  const [worldId, ...queryParts] = positional;
  const query = queryParts.join(' ').trim();
  if (!worldId || !query) {
    console.error('Uso: loom compendium:search <worldId> <termo> [--include-world]');
    process.exitCode = 1;
    return;
  }

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true });
  const qLower = query.toLowerCase();

  try {
    const packs = db.prepare('SELECT id, name, type, entries FROM compendium_packs').all();
    const results = [];

    for (const pack of packs) {
      let entries = [];
      try {
        entries = JSON.parse(pack.entries || '[]');
      } catch {
        continue;
      }

      for (const entry of entries) {
        const name = entry.name || '(sem nome)';
        const desc = JSON.stringify(entry).toLowerCase();
        if (name.toLowerCase().includes(qLower) || desc.includes(qLower)) {
          results.push({
            Nome: name,
            Tipo: entry.type || pack.type,
            Origem: `Pack: ${pack.name}`,
            ID: entry.id || 'N/A'
          });
        }
      }
    }

    if (flags['include-world']) {
      // Também busca nos itens e atores ativos no mundo
      const actors = db.prepare('SELECT id, name, type FROM actors').all();
      for (const a of actors) {
        if (a.name && a.name.toLowerCase().includes(qLower)) {
          results.push({
            Nome: a.name,
            Tipo: `Actor (${a.type})`,
            Origem: 'Mundo (Ator ativo)',
            ID: a.id
          });
        }
      }

      const items = db.prepare('SELECT id, name, type FROM items').all();
      for (const it of items) {
        if (it.name && it.name.toLowerCase().includes(qLower)) {
          results.push({
            Nome: it.name,
            Tipo: `Item (${it.type})`,
            Origem: 'Mundo (Item ativo)',
            ID: it.id
          });
        }
      }
    }

    if (results.length === 0) {
      console.log(`Nenhum resultado encontrado para "${query}" no mundo ${worldId}.`);
    } else {
      console.log(`\nEncontrado(s) ${results.length} resultado(s) para "${query}":`);
      console.table(results);
    }
  } finally {
    db.close();
  }
}
