import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { openDb, resolveDataRoot } from '../db.mjs';

export function run(positional, flags) {
  const [backupInput] = positional;
  if (!backupInput) {
    console.error('Uso: loom world:restore <caminho-do-backup> [--as <worldId>] [--name <nome>] [--system <sistema>]');
    process.exitCode = 1;
    return;
  }

  const inputPath = path.resolve(backupInput);
  let srcSqlite;

  if (fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory()) {
    srcSqlite = path.join(inputPath, 'world.sqlite');
  } else if (fs.existsSync(inputPath) && inputPath.endsWith('.sqlite')) {
    srcSqlite = inputPath;
  }

  if (!srcSqlite || !fs.existsSync(srcSqlite)) {
    console.error(`Arquivo world.sqlite não encontrado em: ${inputPath}`);
    process.exitCode = 1;
    return;
  }

  // Descobre o worldId sugerido a partir do nome da pasta (ex: world-1_2026-08-31..._backup)
  let inferredId;
  const dirBase = path.basename(path.dirname(srcSqlite));
  const match = dirBase.match(/^([^_]+)_.+_backup$/);
  if (match) {
    inferredId = match[1];
  }

  const targetWorldId = flags.as || inferredId || crypto.randomUUID();
  const dataRoot = resolveDataRoot({ env: flags.env, dataRoot: flags['data-root'] });
  const targetWorldDir = path.join(dataRoot, 'worlds', targetWorldId);
  const targetSqlite = path.join(targetWorldDir, 'world.sqlite');

  console.log(`Restaurando para o mundo ID: "${targetWorldId}"`);
  fs.mkdirSync(targetWorldDir, { recursive: true });

  // 1. Copia o banco de dados
  fs.copyFileSync(srcSqlite, targetSqlite);
  console.log(`[✓] Arquivo copiado para: ${targetSqlite}`);

  // 2. Registra ou atualiza no rpg-core.sqlite
  const { db: coreDb, dbPath: coreDbPath } = openDb({ env: flags.env, dataRoot: flags['data-root'] });
  try {
    const existing = coreDb.prepare('SELECT * FROM worlds WHERE id = ?').get(targetWorldId);
    const now = new Date().toISOString();

    if (existing) {
      coreDb.prepare(`
        UPDATE worlds
        SET updatedAt = ?,
            name = COALESCE(?, name),
            system = COALESCE(?, system)
        WHERE id = ?
      `).run(now, flags.name || null, flags.system || null, targetWorldId);
      console.log(`[✓] Registro do mundo atualizado em ${coreDbPath}`);
    } else {
      const worldName = flags.name || (inferredId ? `Mundo ${inferredId} (Restaurado)` : 'Mundo Restaurado');
      const system = flags.system || 'rpg-generic';

      coreDb.prepare(`
        INSERT INTO worlds (
          id, name, system, description, coverUrl, language, adminPassword,
          isActive, packageIds, packageConfig, createdAt, updatedAt, dataPath,
          backgroundUrl, theme, nextSession, safeMode, permissions, isPaused, worldTime
        ) VALUES (
          ?, ?, ?, '', '', 'pt-BR', '',
          0, '[]', '{}', ?, ?, ?,
          '', '', '', 0, '{"compendiumEdit":[],"viewStages":[]}', 0, 0
        )
      `).run(
        targetWorldId,
        worldName,
        system,
        now,
        now,
        `Data/worlds/${targetWorldId}`
      );
      console.log(`[✓] Novo mundo registrado em ${coreDbPath} como "${worldName}"`);
    }

    console.log(`\nRestauração concluída com sucesso! ID: ${targetWorldId}`);
  } finally {
    coreDb.close();
  }
}
