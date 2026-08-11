#!/usr/bin/env node
import { parseArgs } from '../src/args.mjs';

const [, , command, ...rest] = process.argv;
const { positional, flags } = parseArgs(rest);

const commands = {
  'world:list': () => import('../src/commands/world-list.mjs').then(m => m.run(flags)),
  'compendium:list': () => import('../src/commands/compendium-list.mjs').then(m => m.run(positional, flags)),
  'compendium:unpack': () => import('../src/commands/compendium-unpack.mjs').then(m => m.run(positional, flags)),
  'compendium:pack': () => import('../src/commands/compendium-pack.mjs').then(m => m.run(positional, flags)),
};

if (!command || !commands[command]) {
  console.log(`loomvtt-cli — comandos disponíveis:\n`);
  for (const name of Object.keys(commands)) console.log(`  loom ${name}`);
  console.log(`\nFlags globais: --env dev|prod (default dev), --data-root <path>`);
  process.exitCode = command ? 1 : 0;
} else {
  try {
    await commands[command]();
  } catch (err) {
    console.error(`Erro: ${err.message}`);
    process.exitCode = 1;
  }
}
