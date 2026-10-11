import fs from 'fs';
import path from 'path';
import { openWorldDb } from '../db.mjs';

export function run(positional, flags) {
  const [worldId, baseDirInput] = positional;
  if (!worldId) {
    console.error('Uso: loom compendium:pack-all <worldId> [dir]');
    process.exitCode = 1;
    return;
  }

  const baseDir = path.resolve(baseDirInput || './packs');
  if (!fs.existsSync(baseDir)) {
    console.error(`Diretório não encontrado: ${baseDir}`);
    process.exitCode = 1;
    return;
  }

  const subdirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(baseDir, d.name));

  const targetDirs = [];
  // Verifica se o próprio baseDir é um pack ou se seus subdiretórios são packs
  if (fs.existsSync(path.join(baseDir, '_pack.json'))) {
    targetDirs.push(baseDir);
  } else {
    for (const sub of subdirs) {
      if (fs.existsSync(path.join(sub, '_pack.json'))) {
        targetDirs.push(sub);
      }
    }
  }

  if (targetDirs.length === 0) {
    console.log(`Nenhuma pasta com _pack.json encontrada em ${baseDir}.`);
    return;
  }

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'] });
  let totalPacked = 0;
  let packsUpdated = 0;

  try {
    console.log(`Empacotando ${targetDirs.length} pack(s) para o mundo ${worldId} (${dbPath})...\n`);

    for (const dir of targetDirs) {
      const metaPath = path.join(dir, '_pack.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const packId = meta.id;

      if (!packId) {
        console.log(`  [!] Ignorando ${path.basename(dir)}: _pack.json sem campo "id".`);
        continue;
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_pack.json');
      const entries = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));

      const existing = db.prepare('SELECT id FROM compendium_packs WHERE id = ?').get(packId);
      const now = new Date().toISOString();

      if (existing) {
        db.prepare('UPDATE compendium_packs SET entries = ?, updatedAt = ? WHERE id = ?')
          .run(JSON.stringify(entries), now, packId);
      } else {
        db.prepare(`
          INSERT INTO compendium_packs (
            id, worldId, name, type, entries, ownership, folderId, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, '{}', '', ?, ?)
        `).run(packId, worldId, meta.name || path.basename(dir), meta.type || 'Item', JSON.stringify(entries), now, now);
      }

      console.log(`  [✓] ${meta.name || packId}: ${entries.length} entries empacotadas`);
      totalPacked += entries.length;
      packsUpdated++;
    }

    console.log(`\nConcluído! ${packsUpdated} pack(s) gravados com ${totalPacked} entries no total.`);
  } finally {
    db.close();
  }
}
