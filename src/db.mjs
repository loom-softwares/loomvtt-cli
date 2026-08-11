import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

// Espelha a resolução de path de server/applications/database/db.ts do
// loom-virtual-tabletop (getAppDataPath/getDataRoot) — CLI não importa o
// server, só replica a mesma lógica de config pra achar o rpg-core.sqlite.
function getAppDataPath(env) {
  const appData = process.env.LOCALAPPDATA
    || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : path.join(os.homedir(), '.config'));
  const folder = env === 'prod' ? 'LoomVTT' : 'LoomVTT-Dev';
  return path.join(appData, folder);
}

export function resolveDataRoot({ env = process.env.LOOM_ENV || 'dev', dataRoot } = {}) {
  if (dataRoot) return path.resolve(dataRoot);
  if (process.env.LOOM_DATA_ROOT) return path.resolve(process.env.LOOM_DATA_ROOT);

  const appDataDir = getAppDataPath(env);
  const configPath = path.join(appDataDir, 'Config', 'loom.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const configured = cfg.dataPath || cfg.dataRoot;
      if (configured && configured.trim()) return path.resolve(configured.trim());
    } catch { /* config corrompido, cai no default */ }
  }
  return path.join(appDataDir, 'Data');
}

export function openDb(opts = {}) {
  const dataRoot = resolveDataRoot(opts);
  const dbPath = path.resolve(dataRoot, 'rpg-core.sqlite');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Banco não encontrado em ${dbPath} (--data-root pra apontar manualmente, ou LOOM_ENV=prod se o world é de produção).`);
  }
  const db = new Database(dbPath, { readonly: !!opts.readonly });
  return { db, dataRoot, dbPath };
}

// Actors/items/compendium_packs vivem no banco POR WORLD
// (getDataRoot()/worlds/<worldId>/world.sqlite), não no rpg-core.sqlite
// central — ver server/applications/database/world-db.ts.
export function openWorldDb(worldId, opts = {}) {
  if (!worldId) throw new Error('worldId obrigatório.');
  const dataRoot = resolveDataRoot(opts);
  const dbPath = path.resolve(dataRoot, 'worlds', worldId, 'world.sqlite');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Banco do world não encontrado em ${dbPath} (worldId errado, ou --data-root/--env apontando pro lugar errado).`);
  }
  const db = new Database(dbPath, { readonly: !!opts.readonly });
  return { db, dataRoot, dbPath };
}
