# Validation Summary: How to Deploy a Minecraft Server via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Minecraft Java Edition server (`itzg/minecraft-server` Docker image)
- Portainer (Docker stack management UI)
- Docker / Docker Compose
- Paper (Minecraft server software)
- RCON (remote admin protocol) and `rcon-cli` / `mcrcon`
- `itzg/mc-backup` (companion backup container)
- `mc-monitor` (server status / health check tool)
- EssentialsX, LuckPerms (Bukkit/Paper plugins)

## Sources Consulted
- itzg `docker-minecraft-server` documentation: https://docker-minecraft-server.readthedocs.io/en/latest/variables/
- itzg `docker-minecraft-server` source — `scripts/start-setupServerProperties` and `files/property-definitions.json`: https://github.com/itzg/docker-minecraft-server
- itzg `docker-mc-backup` README: https://github.com/itzg/docker-mc-backup
- LuckPerms Jenkins CI (live API): https://ci.lucko.me/job/LuckPerms/lastSuccessfulBuild/api/json
- EssentialsX GitHub releases: https://github.com/EssentialsX/Essentials/releases
- Docker Compose v2 release notes (default container naming convention)

## Issues Found
1. **`GAMEMODE` env var is not recognized by `itzg/minecraft-server`.** The property-definitions file maps `gamemode` to the `MODE` env var, not `GAMEMODE`. Changed `GAMEMODE=survival` to `MODE=survival`.
2. **LuckPerms CI hostname `ci.luckperms.net` does not resolve.** The official Jenkins instance is `ci.lucko.me` (verified — `ci.luckperms.net` returns no DNS, `ci.lucko.me` returns HTTP 200). Updated the `wget` URL accordingly.
3. **LuckPerms version `5.4.137` is not a real released version.** Per the live Jenkins API, current `lastSuccessfulBuild` artifact is `LuckPerms-Bukkit-5.5.42.jar`. Updated the file name in the URL to match an actually-published artifact.
4. **Container name used Compose v1 underscore convention.** Modern Docker Compose (v2), which is the default in current Portainer releases, generates names with hyphens (`<project>-<service>-<index>`). Changed `minecraft_minecraft_1` → `minecraft-minecraft-1` in the two `docker exec` commands.

## Review Notes
- Verified all other server env vars against `property-definitions.json` in the itzg image: `MAX_PLAYERS`, `DIFFICULTY`, `MOTD`, `PVP`, `SERVER_NAME`, `ENABLE_RCON`, `RCON_PASSWORD` are all valid mappings. `ENABLE_WHITELIST` is also explicitly handled in `start-setupServerProperties`.
- Verified `itzg/mc-backup` env vars (`BACKUP_INTERVAL`, `PRUNE_BACKUPS_DAYS`, `RCON_HOST`, `RCON_PASSWORD`, `SERVER_PORT`) are all documented and valid; `SERVER_PORT=25565` is correct usage (it's used to ping the game port to gate backup execution, not to RCON).
- TYPE values listed (VANILLA, SPIGOT, PAPER, FORGE, FABRIC) are all valid; the image actually supports many more (PURPUR, PUFFERFISH, NEOFORGE, QUILT, FOLIA, MOHIST, etc.) but the abbreviated list is fine for a tutorial.
- Minecraft `1.20.4` is a real released Java Edition version.
- EssentialsX 2.20.1 is a real released version and the GitHub release URL pattern is correct.
- The `rcon-cli` and `mc-monitor` binaries are bundled in the itzg image and the invocations shown are correct.
- The container-name fix assumes modern Compose v2; if a user is on legacy Compose v1, they'd need to use underscores instead. Alternatively, the post could set `container_name: minecraft` in the compose file to make this deterministic — worth considering in a future revision but not a correctness bug.
- The hardcoded LuckPerms version will go stale over time; future maintenance could swap to a versionless download (e.g. via the LuckPerms downloads API) to avoid 404s as new builds replace old ones on the Jenkins artifact path.
