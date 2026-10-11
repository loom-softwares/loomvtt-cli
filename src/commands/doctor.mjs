import fs from 'fs';
import path from 'path';
import { resolveDataRoot, openDb, openWorldDb } from '../db.mjs';

export function run(flags = {}) {
  const env = flags.env || process.env.LOOM_ENV || 'dev';
  console.log(`\n=== LoomVTT Doctor (${env}) ===\n`);

  let issues = 0;

  // 1. Data Root
  let dataRoot;
  try {
    dataRoot = resolveDataRoot({ env, dataRoot: flags['data-root'] });
    if (fs.existsSync(dataRoot)) {
      console.log(`[✓] Data Root encontrado: ${dataRoot}`);
    } else {
      console.log(`[✗] Data Root não existe: ${dataRoot}`);
      issues++;
    }
  } catch (err) {
    console.log(`[✗] Erro ao resolver Data Root: ${err.message}`);
    issues++;
  }

  if (!dataRoot || !fs.existsSync(dataRoot)) {
    console.log(`\nDiagnóstico concluído com ${issues} problema(s).`);
    return;
  }

  // 2. rpg-core.sqlite Integrity
  const coreDbPath = path.join(dataRoot, 'rpg-core.sqlite');
  if (!fs.existsSync(coreDbPath)) {
    console.log(`[✗] Banco central não encontrado em ${coreDbPath}`);
    issues++;
  } else {
    try {
      const { db } = openDb({ env, dataRoot, readonly: true });
      const [check] = db.prepare('PRAGMA integrity_check').all();
      const integrity = check ? Object.values(check)[0] : 'desconhecido';
      if (integrity === 'ok') {
        console.log(`[✓] rpg-core.sqlite: integridade OK`);
      } else {
        console.log(`[✗] rpg-core.sqlite: corrompido (${integrity})`);
        issues++;
      }

      const worldCount = db.prepare('SELECT count(*) as c FROM worlds').get()?.c || 0;
      const userCount = db.prepare('SELECT count(*) as c FROM users').get()?.c || 0;
      console.log(`    - Mundos registrados: ${worldCount}`);
      console.log(`    - Usuários registrados: ${userCount}`);
      db.close();
    } catch (err) {
      console.log(`[✗] Falha ao ler rpg-core.sqlite: ${err.message}`);
      issues++;
    }
  }

  // 3. Mundos & world.sqlite Integrity
  const worldsDir = path.join(dataRoot, 'worlds');
  if (fs.existsSync(worldsDir)) {
    const worldDirs = fs.readdirSync(worldsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    console.log(`\nVerificando bancos dos mundos (${worldDirs.length} pastas encontradas):`);
    for (const wid of worldDirs) {
      const wSqlite = path.join(worldsDir, wid, 'world.sqlite');
      if (!fs.existsSync(wSqlite)) {
        console.log(`  [!] Mundo "${wid}": sem world.sqlite`);
        continue;
      }

      try {
        const { db } = openWorldDb(wid, { env, dataRoot, readonly: true });
        const [wCheck] = db.prepare('PRAGMA integrity_check').all();
        const wIntegrity = wCheck ? Object.values(wCheck)[0] : 'desconhecido';
        if (wIntegrity === 'ok') {
          console.log(`  [✓] Mundo "${wid}": integridade OK`);
        } else {
          console.log(`  [✗] Mundo "${wid}": corrompido (${wIntegrity})`);
          issues++;
        }
        db.close();
      } catch (err) {
        console.log(`  [✗] Mundo "${wid}": erro ao abrir (${err.message})`);
        issues++;
      }
    }
  }

  // 4. Pastas de apoio
  const subdirs = ['backups', 'assets', 'uploads'];
  console.log(`\nPastas de sistema:`);
  for (const sub of subdirs) {
    const p = path.join(dataRoot, sub);
    if (fs.existsSync(p)) {
      console.log(`  [✓] ${sub}/ presente`);
    } else {
      console.log(`  [!] ${sub}/ ausente (será criada quando necessário)`);
    }
  }

  console.log(`\nDiagnóstico concluído: ${issues === 0 ? 'tudo certo!' : `${issues} problema(s) detectado(s).`}\n`);
}
