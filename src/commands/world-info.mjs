import fs from 'fs';
import { openDb, openWorldDb } from '../db.mjs';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function run(positional, flags) {
  const [worldId] = positional;
  if (!worldId) {
    console.error('Uso: loom world:info <worldId>');
    process.exitCode = 1;
    return;
  }

  const { db: coreDb } = openDb({ env: flags.env, dataRoot: flags['data-root'], readonly: true });
  let world;
  try {
    world = coreDb.prepare('SELECT * FROM worlds WHERE id = ?').get(worldId);
  } finally {
    coreDb.close();
  }

  if (!world) {
    console.error(`Mundo "${worldId}" não encontrado no rpg-core.sqlite.`);
    process.exitCode = 1;
    return;
  }

  const { db: wDb, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true });
  try {
    const stat = fs.statSync(dbPath);
    const count = (table) => {
      try {
        return wDb.prepare(`SELECT count(*) as c FROM "${table}"`).get()?.c ?? 0;
      } catch {
        return 0;
      }
    };

    console.log(`\n=== Informações do Mundo: ${world.name} ===`);
    console.log(`ID:           ${world.id}`);
    console.log(`Sistema:      ${world.system || '(não definido)'}`);
    console.log(`Idioma:       ${world.language || 'pt-BR'}`);
    console.log(`Criado em:    ${world.createdAt || 'N/A'}`);
    console.log(`Atualizado:   ${world.updatedAt || 'N/A'}`);
    console.log(`Banco:        ${dbPath} (${formatBytes(stat.size)})`);

    console.log(`\n--- Conteúdo do Mundo ---`);
    console.log(`Atores:       ${count('actors')}`);
    console.log(`Itens:        ${count('items')}`);
    console.log(`Cenas/Stages: ${count('stages')}`);
    console.log(`Journals:     ${count('journals')}`);
    console.log(`Packs:        ${count('compendium_packs')}`);
    console.log(`Pastas:       ${count('folders')}`);
    console.log(`Playlists:    ${count('playlists')}`);
    console.log(`Combates:     ${count('combats')}`);
    console.log(`Mensagens:    ${count('chat_messages')}\n`);
  } finally {
    wDb.close();
  }
}
