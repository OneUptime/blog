# Validation Summary: How to Run a Minecraft Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose v2
- itzg/minecraft-server Docker image
- itzg/mc-backup Docker image
- Minecraft Java Edition dedicated server
- Paper server
- Forge modded server
- RCON

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- itzg/minecraft-server Docker Hub page: https://hub.docker.com/r/itzg/minecraft-server
- Minecraft Server on Docker variables: https://docker-minecraft-server.readthedocs.io/en/latest/variables/
- Minecraft Server on Docker server properties: https://docker-minecraft-server.readthedocs.io/en/latest/configuration/server-properties/
- Minecraft Server on Docker command access: https://docker-minecraft-server.readthedocs.io/en/latest/sending-commands/commands/
- itzg/mc-backup documentation: https://github.com/itzg/docker-mc-backup
- PaperMC documentation: https://docs.papermc.io/
- Minecraft Wiki gamerule command reference: https://minecraft.wiki/w/Commands/gamerule

## Issues Found
- The Compose snippets used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose uses the Compose Specification and reports `version` as obsolete.
- The Compose snippets showed `docker attach` usage but did not enable `stdin_open` and `tty`, which the itzg documentation requires for an interactive attached console. Added both settings to the Minecraft services.
- The backup service used `RCON_PASSWORD: minecraft`, but the Minecraft service did not set the same password. Current itzg documentation says the server RCON password is randomly generated unless explicitly set. Added `RCON_PASSWORD: "minecraft"` to the main Compose example so the companion backup service can authenticate.
- The manual backup commands ran `save-all` before `save-off`. Reordered them to disable saving first and then flush with `save-all`, matching the safe backup sequence documented by the backup image.
- The performance tuning section used `rcon-cli tps` without noting that `tps` is a Paper/Spigot-family command, not a vanilla command. Clarified that it applies to Paper servers.
- The performance tuning section used `gamerule viewDistance 8`, but `viewDistance` is not a valid Java Edition gamerule. Replaced it with guidance to adjust the `VIEW_DISTANCE` environment variable and recreate the container.

## Review Notes
- The examples use the unpinned `itzg/minecraft-server` and `itzg/mc-backup` image tags. That is valid for a beginner guide, but production deployments may prefer pinned tags or a controlled update process.
- The sample RCON password is intentionally simple for local examples. Public or shared deployments should use a stronger password or Docker secrets, especially if RCON is ever exposed outside the Docker network.
