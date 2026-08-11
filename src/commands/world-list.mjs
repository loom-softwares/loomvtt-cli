import { openDb } from '../db.mjs';

export function run(flags) {
  const { db, dbPath } = openDb({ env: flags.env, dataRoot: flags['data-root'], readonly: true });
  try {
    const rows = db.prepare(
      `SELECT id, name, system, isActive, updatedAt FROM worlds ORDER BY updatedAt DESC`
    ).all();

    if (rows.length === 0) {
      console.log(`Nenhum world encontrado (${dbPath}).`);
      return;
    }

    console.log(`Worlds em ${dbPath}:\n`);
    for (const w of rows) {
      const active = w.isActive ? '● ativo ' : '  ';
      console.log(`${active}${w.id}  ${w.name}  [${w.system}]  atualizado ${w.updatedAt}`);
    }
  } finally {
    db.close();
  }
}
