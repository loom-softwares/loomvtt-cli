#!/usr/bin/env node
import { parseArgs } from '../src/args.mjs';

const [, , command, ...rest] = process.argv;
const { positional, flags } = parseArgs(rest);

const commands = {
  // Diagnóstico & Banco
  'doctor': () => import('../src/commands/doctor.mjs').then(m => m.run(flags)),
  'db:query': () => import('../src/commands/db-query.mjs').then(m => m.run(positional, flags)),
  'db:stats': () => import('../src/commands/db-stats.mjs').then(m => m.run(positional, flags)),

  // Mundos & Backups
  'world:list': () => import('../src/commands/world-list.mjs').then(m => m.run(flags)),
  'world:info': () => import('../src/commands/world-info.mjs').then(m => m.run(positional, flags)),
  'world:backup': () => import('../src/commands/world-backup.mjs').then(m => m.run(positional, flags)),
  'world:restore': () => import('../src/commands/world-restore.mjs').then(m => m.run(positional, flags)),

  // Compendiums
  'compendium:list': () => import('../src/commands/compendium-list.mjs').then(m => m.run(positional, flags)),
  'compendium:create': () => import('../src/commands/compendium-create.mjs').then(m => m.run(positional, flags)),
  'compendium:search': () => import('../src/commands/compendium-search.mjs').then(m => m.run(positional, flags)),
  'compendium:unpack': () => import('../src/commands/compendium-unpack.mjs').then(m => m.run(positional, flags)),
  'compendium:unpack-all': () => import('../src/commands/compendium-unpack-all.mjs').then(m => m.run(positional, flags)),
  'compendium:pack': () => import('../src/commands/compendium-pack.mjs').then(m => m.run(positional, flags)),
  'compendium:pack-all': () => import('../src/commands/compendium-pack-all.mjs').then(m => m.run(positional, flags)),

  // Pacotes & Dev Tools
  'package:list': () => import('../src/commands/package-list.mjs').then(m => m.run(positional, flags)),
  'package:link': () => import('../src/commands/package-link.mjs').then(m => m.run(positional, flags)),
  'package:unlink': () => import('../src/commands/package-unlink.mjs').then(m => m.run(positional, flags)),
  'scaffold:system': () => import('../src/commands/scaffold.mjs').then(m => m.run('system', positional, flags)),
  'scaffold:ruleset': () => import('../src/commands/scaffold.mjs').then(m => m.run('system', positional, flags)),
  'scaffold:addon': () => import('../src/commands/scaffold.mjs').then(m => m.run('addon', positional, flags)),
};

function showHelp() {
  console.log(`\nloomvtt-cli — Ferramentas de dados e desenvolvimento para LoomVTT\n`);
  console.log(`Uso: loom <comando> [argumentos] [flags]\n`);

  console.log(`Diagnóstico & Banco:`);
  console.log(`  loom doctor                                    Verifica integridade de ambiente e SQLite`);
  console.log(`  loom db:query "<SQL>" [--world <id>] [--json]  Executa query SQL direta`);
  console.log(`  loom db:stats [worldId]                        Estatísticas de tamanho e contagem de tabelas\n`);

  console.log(`Mundos & Backups:`);
  console.log(`  loom world:list                                Lista mundos registrados`);
  console.log(`  loom world:info <worldId>                      Detalhes completos e contagens do mundo`);
  console.log(`  loom world:backup <worldId> [--out <dir>]      Cria snapshot seguro do SQLite e dump.json`);
  console.log(`  loom world:restore <caminho> [--as <id>]       Restaura mundo e registra no rpg-core\n`);

  console.log(`Compendiums:`);
  console.log(`  loom compendium:list <worldId>                 Lista compendiums do mundo`);
  console.log(`  loom compendium:create <worldId> <nome>        Cria novo pack no banco`);
  console.log(`  loom compendium:search <worldId> <termo>       Busca itens/atores nos compendiums`);
  console.log(`  loom compendium:unpack <worldId> <packId>      Desempacota pack em arquivos JSON`);
  console.log(`  loom compendium:unpack-all <worldId>           Desempacota todos os packs do mundo`);
  console.log(`  loom compendium:pack <worldId> <dir>           Empacota pasta JSON de volta no banco`);
  console.log(`  loom compendium:pack-all <worldId> [dir]       Empacota todas as pastas em lote\n`);

  console.log(`Pacotes & Dev Tools (Sistemas e Addons):`);
  console.log(`  loom package:list                              Lista rulesets e addons instalados`);
  console.log(`  loom package:link [caminho]                    Cria symlink no marketplace para dev`);
  console.log(`  loom package:unlink <id>                       Remove o symlink de desenvolvimento`);
  console.log(`  loom scaffold:system <id>                      Gera esqueleto inicial de novo sistema`);
  console.log(`  loom scaffold:addon <id>                       Gera esqueleto inicial de novo addon\n`);

  console.log(`Flags globais:`);
  console.log(`  --env dev|prod                                 Ambiente alvo (padrão: dev)`);
  console.log(`  --data-root <path>                             Sobrescreve caminho para a pasta Data\n`);
}

async function main() {
  if (!command || !commands[command]) {
    showHelp();
    process.exitCode = command ? 1 : 0;
  } else {
    try {
      await commands[command]();
    } catch (err) {
      console.error(`Erro: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

main();
