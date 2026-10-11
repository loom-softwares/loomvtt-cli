import crypto from 'crypto';
import { openWorldDb } from '../db.mjs';

function normalizeType(type = 'Item') {
  const map = {
    item: 'Item',
    actor: 'Actor',
    journal: 'Journal',
    macro: 'Macro',
    rolltable: 'RollTable',
    stage: 'Stage'
  };
  const lower = type.toLowerCase();
  return map[lower] || (type.charAt(0).toUpperCase() + type.slice(1));
}

export function run(positional, flags) {
  const [worldId, name] = positional;
  if (!worldId || !name) {
    console.error('Uso: loom compendium:create <worldId> <nome> [--type <Item|Actor|Journal|Macro>] [--id <customId>]');
    process.exitCode = 1;
    return;
  }

  const packId = flags.id || crypto.randomUUID();
  const packType = normalizeType(flags.type);
  const now = new Date().toISOString();

  const { db, dbPath } = openWorldDb(worldId, { env: flags.env, dataRoot: flags['data-root'] });
  try {
    const existing = db.prepare('SELECT id FROM compendium_packs WHERE id = ?').get(packId);
    if (existing) {
      console.error(`Já existe um pack com ID "${packId}" em ${dbPath}.`);
      process.exitCode = 1;
      return;
    }

    db.prepare(`
      INSERT INTO compendium_packs (
        id, worldId, name, type, entries, ownership, folderId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, '[]', '{}', '', ?, ?)
    `).run(packId, worldId, name, packType, now, now);

    console.log(`[✓] Compendium criado com sucesso em ${dbPath}:`);
    console.log(`    Nome: ${name}`);
    console.log(`    Tipo: ${packType}`);
    console.log(`    ID:   ${packId}`);
  } finally {
    db.close();
  }
}
