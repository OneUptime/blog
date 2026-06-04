# Validation Summary: How to Run an ARK: Survival Evolved Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- ARK: Survival Evolved dedicated servers
- SteamCMD / Steam Workshop mods
- hermsi/ark-server Docker image
- turzam/ark Docker image
- ARK Server Tools / arkmanager
- RCON administration

## Sources Consulted
- Docker Compose history and file format documentation: https://docs.docker.com/compose/intro/history/
- Docker Compose services reference for environment and ports syntax: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy resources reference: https://docs.docker.com/reference/compose-file/deploy/
- hermsi/ark-server Docker Hub documentation: https://hub.docker.com/r/hermsi/ark-server/
- Hermsi1337/docker-ark-server source configuration and entrypoint: https://github.com/Hermsi1337/docker-ark-server
- turzam/ark Docker Hub documentation: https://hub.docker.com/r/turzam/ark/
- TuRz4m/Ark-docker source configuration and compose example: https://github.com/TuRz4m/Ark-docker
- ARK Official Community Wiki dedicated server setup: https://ark.wiki.gg/wiki/Dedicated_server_setup
- ARK Official Community Wiki server configuration: https://ark.wiki.gg/wiki/Server_configuration
- arkmanager / ARK Server Tools documentation: https://github.com/arkmanager/ark-server-tools

## Issues Found
- The primary `hermsi/ark-server` Compose example used `MAP`, but the image documents `SERVER_MAP`. Changed the environment variable to `SERVER_MAP`.
- The primary `hermsi/ark-server` Compose example mounted and referenced `/ark`, but the image defaults to `/app`. Updated volumes, configuration paths, mod setup, and backup commands to use `/app`.
- The primary Compose example included unsupported `ENABLE_RCON` and `DIFFICULTY` environment variables for `hermsi/ark-server`. Replaced the RCON setting with documented `RCON_PORT` and removed the unsupported difficulty environment variable.
- The `turzam/ark` example exposed ports that do not match the image documentation. Updated it to expose `7778`, `27015`, and RCON port `32330`, and added `STEAMPORT`.
- The mod example appended `ActiveMods` directly to `GameUserSettings.ini`, which could place the setting outside `[ServerSettings]` and does not match the hermsi image's documented mod flow. Replaced it with `GAME_MOD_IDS` in Compose.
- The cluster example used `MAP` and `/ark` for `hermsi/ark-server`. Updated it to `SERVER_MAP` and `/app`.
- The cluster example only shared a directory and did not pass ARK's required `-clusterid` and `-ClusterDirOverride` launch options. Added `arkmanager` command options for both servers.
- Removed legacy top-level `version: "3.8"` entries from Compose examples because current Docker Compose uses the Compose Specification and ignores the old version field.

## Review Notes
The corrected Compose snippets were checked with `docker compose config -q`. The `turzam/ark` image is still documented but has not been updated in many years, so the primary `hermsi/ark-server` example is the better current recommendation.
