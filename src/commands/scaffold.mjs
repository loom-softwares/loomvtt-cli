import fs from 'fs';
import path from 'path';

function toTitle(slug) {
  return slug
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function run(type, positional, flags) {
  const [pkgName] = positional;
  if (!pkgName) {
    console.error(`Uso: loom scaffold:${type} <nome-do-pacote> [--out <dir>]`);
    process.exitCode = 1;
    return;
  }

  const slug = pkgName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const title = flags.title || toTitle(slug);
  const outDir = path.resolve(flags.out || path.join('.', slug));

  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0 && !flags.force) {
    console.error(`A pasta de destino ${outDir} já existe e não está vazia. Use --force para continuar.`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  if (type === 'system' || type === 'ruleset') {
    // 1. Scaffold Ruleset
    const manifest = {
      name: slug,
      title: title,
      version: '0.1.0',
      engine: 'loom',
      type: 'ruleset',
      engineVersion: '>=0.1.0',
      author: flags.author || '',
      description: `Sistema de regras ${title} para LoomVTT.`,
      client: 'client.js',
      itemTypes: {
        item: { label: 'Item Comum' },
        weapon: { label: 'Arma' },
        armor: { label: 'Armadura' }
      },
      actorTypes: {
        character: { label: 'Personagem' },
        npc: { label: 'NPC / Monstro' }
      }
    };

    fs.writeFileSync(path.join(outDir, 'ruleset.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    const clientJs = `// Entry point client-side para o sistema "${title}"
console.log('[${slug}] Inicializando regras do sistema...');

// Registre custom hooks, sheets ou configurações de UI aqui
`;
    fs.writeFileSync(path.join(outDir, 'client.js'), clientJs, 'utf-8');

    // Templates
    const tplDir = path.join(outDir, 'templates');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(
      path.join(tplDir, 'character-sheet.hbs'),
      `<form class="character-sheet">\n  <header>\n    <h1>{{actor.name}}</h1>\n  </header>\n  <main>\n    <!-- Atributos e inventário do personagem -->\n  </main>\n</form>\n`,
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tplDir, 'item-sheet.hbs'),
      `<form class="item-sheet">\n  <header>\n    <h1>{{item.name}}</h1>\n  </header>\n  <main>\n    <!-- Propriedades do item -->\n  </main>\n</form>\n`,
      'utf-8'
    );

    // CSS
    const stylesDir = path.join(outDir, 'styles');
    fs.mkdirSync(stylesDir, { recursive: true });
    fs.writeFileSync(path.join(stylesDir, `${slug}.css`), `/* Estilos para o sistema ${title} */\n`, 'utf-8');

    // Readme
    const readme = `# ${title}\n\nSistema de regras para **LoomVTT**.\n\n## Desenvolvimento\n\nPara vincular este sistema à sua instalação local do LoomVTT:\n\`\`\`bash\nloom package:link .\n\`\`\`\n`;
    fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf-8');

    console.log(`[✓] Estrutura do sistema criada com sucesso em: ${outDir}`);
    console.log(`\nArquivos gerados:`);
    console.log(`  - ruleset.json`);
    console.log(`  - client.js`);
    console.log(`  - templates/character-sheet.hbs`);
    console.log(`  - templates/item-sheet.hbs`);
    console.log(`  - styles/${slug}.css`);
    console.log(`  - README.md`);
  } else {
    // 2. Scaffold Addon
    const manifest = {
      name: slug,
      title: title,
      version: '0.1.0',
      engine: 'loom',
      type: 'addon',
      engineVersion: '>=0.1.0',
      author: flags.author || '',
      description: `Addon ${title} para LoomVTT.`,
      active: true,
      client: 'client.js'
    };

    fs.writeFileSync(path.join(outDir, 'addon.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

    const clientJs = `// Entry point client-side para o addon "${title}"
console.log('[${slug}] Addon carregado com sucesso!');
`;
    fs.writeFileSync(path.join(outDir, 'client.js'), clientJs, 'utf-8');

    const readme = `# ${title}\n\nAddon para **LoomVTT**.\n\n## Desenvolvimento\n\nPara vincular este addon à sua instalação local:\n\`\`\`bash\nloom package:link .\n\`\`\`\n`;
    fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf-8');

    console.log(`[✓] Estrutura do addon criada com sucesso em: ${outDir}`);
    console.log(`\nArquivos gerados:`);
    console.log(`  - addon.json`);
    console.log(`  - client.js`);
    console.log(`  - README.md`);
  }

  console.log(`\nPara começar a desenvolver, execute:`);
  console.log(`  cd ${path.relative(process.cwd(), outDir) || '.'}`);
  console.log(`  loom package:link .`);
}
