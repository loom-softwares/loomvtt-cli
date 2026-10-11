# loomvtt-cli

CLI de dados e ferramentas de desenvolvimento do **LoomVTT** — interage diretamente com os bancos SQLite (sem precisar do servidor rodando) e agiliza o fluxo de trabalho de desenvolvedores e mestres.

## Instalação

```bash
npm install
npm link   # expõe o comando `loom` globalmente no seu terminal
```

### Gerando o Executável (`loom-cli.exe`)

Se você quiser gerar um binário `.exe` portátil (para rodar sem precisar de Node.js instalado na máquina):

```bash
npm run build:exe
```

Isso gera na pasta `dist/`:
- `loom-cli.exe`: o binário executável independente.
- `better_sqlite3.node`: a biblioteca C++ nativa do SQLite.

Basta colocar os dois arquivos na mesma pasta e rodar:
```powershell
.\loom-cli.exe doctor
.\loom-cli.exe world:list
.\loom-cli.exe compendium:search <worldId> <termo>
```

---

## Comandos

### 🏥 Diagnóstico & Banco de Dados

```bash
loom doctor                                    # Verifica integridade do SQLite e pastas
loom db:query "SELECT * FROM worlds"           # Query direta no rpg-core.sqlite
loom db:query "SELECT name FROM actors" --world <worldId>   # Query no world.sqlite
loom db:stats                                  # Tamanho e contagens do rpg-core.sqlite
loom db:stats <worldId>                        # Tamanho e contagens do mundo
```

### 🌍 Mundos & Backups

```bash
loom world:list                                # Lista todos os mundos
loom world:info <worldId>                      # Estatísticas completas (atores, itens, cenas, etc.)
loom world:backup <worldId> [--out <dir>]      # Snapshot seguro via SQLite backup API + dump.json
loom world:restore <backupDir> [--as <id>]     # Restaura backup e registra no rpg-core
```

### 📦 Compendiums

```bash
loom compendium:list <worldId>                 # Lista compendiums do mundo
loom compendium:create <worldId> <nome> [--type Item|Actor|Journal]  # Cria novo pack
loom compendium:search <worldId> <termo>       # Busca itens em todos os packs do mundo
loom compendium:unpack <worldId> <packId> [--out <dir>] # Extrai pack em arquivos .json
loom compendium:unpack-all <worldId> [--out <dir>]      # Extrai todos os packs do mundo
loom compendium:pack <worldId> <dir> [--into <packId>]  # Empacota pasta JSON no banco
loom compendium:pack-all <worldId> [dir]       # Empacota todas as pastas que contêm _pack.json
```

### 🧩 Pacotes & Desenvolvimento (Sistemas & Addons)

```bash
loom package:list                              # Lista rulesets/addons instalados e links dev
loom package:link [caminho]                    # Cria symlink em marketplace/ para dev em tempo real
loom package:unlink <id>                       # Remove symlink de desenvolvimento
loom scaffold:system <nome>                    # Gera boilerplate de novo ruleset (com .hbs e styles)
loom scaffold:addon <nome>                     # Gera boilerplate de novo addon
```

---

## Flags Globais

- `--env dev|prod`: Seleciona ambiente (padrão: `dev`).
- `--data-root <path>`: Sobrescreve e aponta diretamente para qualquer pasta `Data`.

---

## Como acha o banco

Replica a resolução do LoomVTT: lê `%LOCALAPPDATA%\LoomVTT-Dev\Config\loom.config.json` (ou `LoomVTT` se `--env prod`), descobre o `dataPath` e acessa:

- `<dataPath>/rpg-core.sqlite`: banco central (mundos, usuários, pacotes).
- `<dataPath>/worlds/<worldId>/world.sqlite`: banco específico do mundo.
- `<dataPath>/marketplace/rulesets/` e `<dataPath>/marketplace/addons/`: pacotes instalados ou linkados.
- `<dataPath>/backups/worlds/`: pasta padrão de backups.
