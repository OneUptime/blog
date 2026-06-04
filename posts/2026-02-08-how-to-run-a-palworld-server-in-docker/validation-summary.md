# Validation Summary: How to Run a Palworld Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose
- Palworld dedicated server
- thijsvanloef/palworld-server-docker container image
- SteamCMD
- RCON
- Cron-based backups and updates

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy resources documentation: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose service memory limit documentation: https://docs.docker.com/reference/compose-file/services/
- Docker CLI help for `docker run`, `docker exec`, `docker cp`, and `docker stats`
- palworld-server-docker quick setup documentation: https://palworld-server-docker.loef.dev/
- palworld-server-docker server settings documentation: https://palworld-server-docker.loef.dev/getting-started/configuration/server-settings/
- palworld-server-docker game settings documentation: https://palworld-server-docker.loef.dev/getting-started/configuration/game-settings
- palworld-server-docker RCON command documentation: https://palworld-server-docker.loef.dev/getting-started/configuration/server-commands
- palworld-server-docker GitHub README: https://github.com/thijsvanloef/palworld-server-docker
- Official Palworld server configuration documentation: https://tech.palworldgame.com/settings-and-operation/configuration
- Official Palworld server command documentation: https://tech.palworldgame.com/settings-and-operation/commands
- Steam Palworld store page for current Early Access status: https://store.steampowered.com/app/1623730/Palworld/

## Issues Found
- The post listed 8GB RAM as the server requirement, but the current palworld-server-docker documentation lists 16GB minimum RAM and recommends more than 32GB for stable operation. Updated the prerequisite, explanatory text, Compose memory limit, and summary to use 16GB.
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from both Compose snippets because current Docker Compose uses the Compose Specification and treats `version` as informational/obsolete.
- The world-setting environment variables `DAY_TIME_SPEED_RATE` and `NIGHT_TIME_SPEED_RATE` did not match the current palworld-server-docker environment variable names. Updated them to `DAYTIME_SPEEDRATE` and `NIGHTTIME_SPEEDRATE`.
- The startup section claimed the first download was about 5GB. Current image documentation lists storage requirements rather than that exact download size, so the text now says the first startup downloads the server files through SteamCMD without a fixed size.
- The restore command used `docker exec palworld-server restore BACKUP_FILE_NAME`, but the image documentation shows an interactive restore command. Updated it to `docker exec -it palworld-server restore`.

## Review Notes
The full Docker Compose snippets were validated with `docker compose config -q` after the edits. RCON commands, port mappings, backup command, Docker commands, and the documented game/server environment variables were otherwise consistent with the consulted documentation.
