# Validation Summary: How to Deploy a Minecraft Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Portainer (Docker management UI)
- Docker / Docker Compose
- `itzg/minecraft-server` Docker image
- `itzg/rcon` (rcon-web-admin) Docker image
- `itzg/mc-backup` Docker image
- Minecraft Java Edition (Paper/Spigot/Vanilla/Forge/Fabric)
- RCON (Remote Console) protocol
- Modrinth / CurseForge mod sources

## Sources Consulted
- itzg/docker-minecraft-server official docs: https://docker-minecraft-server.readthedocs.io/
- itzg/docker-minecraft-server GitHub README and `docs/variables.md`: https://github.com/itzg/docker-minecraft-server
- itzg/docker-minecraft-server `docs/mods-and-plugins/index.md` (PLUGINS / MODS env vars)
- itzg/rcon Docker Hub page: https://hub.docker.com/r/itzg/rcon
- itzg/docker-mc-backup README: https://github.com/itzg/docker-mc-backup
- Dockerfile for itzg/minecraft-server (confirms `mc-health` HEALTHCHECK binary)

## Issues Found

1. **Incorrect environment variable name `GAMEMODE`** — The `itzg/minecraft-server` image uses `MODE`, not `GAMEMODE`, to set the game mode (survival/creative/adventure/spectator). `GAMEMODE` is not a recognized variable; only `FORCE_GAMEMODE` exists, and that maps to a different `server.properties` setting. Fixed by replacing `- GAMEMODE=survival` with `- MODE=survival`.

2. **Invalid YAML syntax for multi-URL `PLUGINS` value** — The original snippet used backslash line continuation inside a list-style `environment:` entry:
   ```yaml
   - PLUGINS=https://dev.bukkit.org/projects/essentialsx/files/latest/download,\
              https://ci.lucko.me/job/LuckPerms/...
   ```
   Backslash continuation is a shell feature, not a YAML feature; in YAML the backslash and the leading whitespace would be included in the string, producing a broken URL. Additionally, the EssentialsX `dev.bukkit.org/projects/essentialsx/files/latest/download` URL serves a redirect to a download page, not a JAR file, so it does not produce a usable plugin file. Fixed by switching to YAML literal-block-scalar (`|`) form per the official docs, and removing the broken EssentialsX URL while keeping the working LuckPerms direct JAR URL as the example.

## Review Notes

- **Description vs. content mismatch**: The frontmatter description mentions deploying "a Minecraft Java or Bedrock server," but the post only covers Java. Bedrock servers require the separate `itzg/minecraft-bedrock-server` image. Left unchanged since this is a description/scope issue rather than a technical error in the implementation steps.
- **`RWA_ADMIN` env var**: Not explicitly documented in the `itzg/rcon` Docker Hub README, but the image inherits all upstream `RWA_*` vars from `rcon-web-admin` via `RWA_ENV=TRUE`. Left as-is since it appears valid and harmless.
- **`itzg/rcon` image name**: Verified correct. The GitHub source repo is named `itzg/docker-rcon-web-admin`, but the published Docker Hub image is `itzg/rcon`. There is no `itzg/rcon-web-admin` image on Docker Hub.
- **`docker-compose` `version: "3.8"` field**: Still works but is ignored by modern Docker Compose v2; the field has been deprecated. Not a functional bug, so left unchanged.
- **`/tps` command** (Step 5): This is a Paper/Spigot command, not vanilla Minecraft. Since the example sets `TYPE=PAPER`, this is fine.
- **Plugin URL examples**: Bukkit Dev redirect URLs are unreliable for automated downloads. For real deployments, users should prefer `MODRINTH_PROJECTS` or `SPIGET_RESOURCES` env vars where possible, or direct JAR URLs from the plugin author.
