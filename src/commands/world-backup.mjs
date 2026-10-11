import fs from 'fs';
import path from 'path';
import { openDb, openWorldDb, resolveDataRoot } from '../db.mjs';

const DUMP_TABLES = [
  'folders', 'actors', 'items', 'stages', 'tiles', 'walls',
  'ambient_lights', 'drawings', 'notes', 'ambient_sound', 'noises',
  'journals', 'journal_pages', 'playlists', 'playlist_sounds',
  'roll_tables', 'roll_table_entries', 'cast', 'chat_messages',
  'combats', 'macros', 'compendium_packs', 'decks', 'buffs',
  'zones', 'fog_reveals', 'templates', 'levels'
];

export async function run(positional, flags) {
  const [worldId] = positional;
  if (!worldId) {
    console.error('Uso: loom world:backup <worldId> [--out <dir>] [--no-dump]');
    process.exitCode = 1;
    return;
  }

  const dataRoot = resolveDataRoot({ env: flags.env, dataRoot: flags['data-root'] });
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

  // Nome padrão: <worldId>_<timestamp>_backup (compatível com LoomVTT)
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const defaultDir = path.join(dataRoot, 'backups', 'worlds', `${worldId}_${ts}_backup`);
  const outDir = path.resolve(flags.out || defaultDir);

  fs.mkdirSync(outDir, { recursive: true });

  const destSqlite = path.join(outDir, 'world.sqlite');
  const { db: wDb, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'], readonly: true });

  try {
    console.log(`Iniciando backup seguro de "${world.name}" (${worldId})...`);
    // 1. Snapshot binário nativo do SQLite
    await wDb.backup(destSqlite);
    console.log(`[✓] Snapshot do banco criado em: ${destSqlite}`);

    // 2. Export JSON compatível (dump.json) se não tiver --no-dump
    if (!flags['no-dump']) {
      const dump = {};
      for (const table of DUMP_TABLES) {
        try {
          const rows = wDb.prepare(`SELECT * FROM "${table}"`).all();
          dump[table] = rows;
        } catch {
          // Tabela pode não existir nesta versão do schema
        }
      }
      const dumpPath = path.join(outDir, 'dump.json');
      fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2), 'utf-8');
      console.log(`[✓] Export estruturado salvo em: ${dumpPath}`);
    }

    console.log(`\nBackup concluído com sucesso em:\n${outDir}`);
  } finally {
    wDb.close();
  }
}
