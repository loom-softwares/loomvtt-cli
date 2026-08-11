# loomvtt-cli

CLI de dados/dev tools do LoomVTT — lê os bancos SQLite direto (sem precisar do
servidor rodando), pra tarefas que hoje só dão pra fazer com SQL manual.

## Instalação

```bash
npm install
npm link   # opcional, expõe o comando `loom` globalmente
```

## Uso

```bash
loom world:list
loom compendium:list <worldId>
loom compendium:unpack <worldId> <packId> [--out dir]
loom compendium:pack <worldId> <dir> [--into packId]
```

Flags globais: `--env dev|prod` (default `dev`), `--data-root <path>` (sobrescreve
tudo, aponta direto pra pasta `Data` de qualquer instalação).

## Como acha o banco

Replica a resolução de `server/applications/database/db.ts` do
`loom-virtual-tabletop`: lê `%LOCALAPPDATA%\LoomVTT-Dev\Config\loom.config.json`
(ou `LoomVTT` se `--env prod`), pega `dataPath`, e abre:

- `<dataPath>/rpg-core.sqlite` — worlds, users, settings (banco central).
- `<dataPath>/worlds/<worldId>/world.sqlite` — actors, items, compendium_packs
  etc. (banco por world).

## Formato do unpack

`compendium:unpack` grava um `.json` por entry (`<slug-do-nome>--<id-curto>.json`)
mais um `_pack.json` com os metadados do pack, pra dar diff legível no git em vez
de um blob gigante. `compendium:pack` lê essa mesma pasta e reconstrói o pack.
