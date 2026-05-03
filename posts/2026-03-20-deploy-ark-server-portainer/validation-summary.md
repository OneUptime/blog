# Validation Summary: How to Deploy an ARK Server via Portainer - Deploy

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ARK: Survival Evolved (dedicated server)
- ARK: Survival Ascended (mentioned)
- Docker / Docker Compose
- Portainer
- arkmanager (`ark-server-tools`)
- `thmhoag/arkserver` Docker image
- RCON (Source RCON protocol)
- Steam Workshop mods
- ARK GameUserSettings.ini configuration

## Sources Consulted
- [thmhoag/arkserver GitHub repository](https://github.com/thmhoag/arkserver) - reference for the Docker image, env var conventions, exposed ports, and volume layout.
- [arkmanager / ark-server-tools](https://github.com/arkmanager/ark-server-tools) - canonical source for arkmanager configuration variable conventions (`ark_`, `arkflag_`, `arkopt_`).
- [arkmanager Issue #695 — `arkopt_ClusterDirOverride`](https://github.com/FezVrasta/ark-server-tools/issues/695) - confirmation of correct cluster setup variable name.
- [r15ch13/arkcluster](https://github.com/r15ch13/arkcluster) and [ceitoh/arkcluster](https://github.com/ceitoh/arkcluster) - reference implementations of arkmanager cluster configuration.
- [ARK Official Community Wiki — Server configuration](https://ark.wiki.gg/wiki/Server_configuration) - validation of `GameUserSettings.ini` keys including `TheMaxStructuresInRange`, `OfficialDifficulty`, `RCONEnabled`, `RCONPort`, etc.
- [Docker Hub API check](https://hub.docker.com/v2/repositories/acemod/ark/) returned 404; [thmhoag/arkserver](https://hub.docker.com/v2/repositories/thmhoag/arkserver/) returned 200 - establishing the original image reference was non-existent.

## Issues Found
1. **Non-existent Docker image (`acemod/ark`)** - The post referenced `acemod/ark:latest`, but no such image exists on Docker Hub (the `acemod` GitHub org maintains Arma 3 / Reforger projects, not ARK). Replaced with the actual popular community image `thmhoag/arkserver:latest`, which uses the same `am_*` env-var prefix convention the post relies on. Updated both the introduction and the two compose snippets.
2. **Wrong config file path** - The post said to edit `/ark/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini`, but in `thmhoag/arkserver` the game install lives under `/ark/server/`, so the correct path is `/ark/server/ShooterGame/Saved/Config/LinuxServer/GameUserSettings.ini`. Fixed.
3. **Incorrect cluster env var prefix** - The cluster snippet used `am_arkcluster_ClusterDirOverride`, which is not a valid arkmanager variable. arkmanager exposes the engine flag via `arkopt_` (dash-option-with-value) — the correct variable is `arkopt_ClusterDirOverride`, so the env var becomes `am_arkopt_ClusterDirOverride`. Fixed.
4. **Missing cluster ID** - A working ARK cluster also requires a shared `clusterid` (otherwise transfers between servers will not work even with a shared directory). Added `am_arkopt_clusterid=my-ark-cluster` to the cluster service example.

## Review Notes
- The opening sentence still mentions ARK: Survival Ascended (UE5). The `thmhoag/arkserver` image is for the original ARK: Survival Evolved only; ASA does not have a native Linux server and would require a Proton/Wine-based image (e.g. `mschnitzer/ark-survival-ascended-linux-container-image`). The intro now scopes the guide explicitly to ARK: Survival Evolved.
- `version: "3.8"` in the Compose file is harmless but is treated as obsolete by recent Docker Compose v2 releases (it emits a warning). Left as-is since it still works.
- The default ARK ports (7777/udp game, 7778/udp game+1, 27015/udp Steam query, 32330/tcp RCON) and the `GameUserSettings.ini` keys used (`TheMaxStructuresInRange`, `OfficialDifficulty`, `DifficultyOffset`, `AutoSavePeriodMinutes`, `RCONEnabled`, `RCONPort`) all match official ARK server documentation.
- The `rcon` CLI used in Step 3 (`-H`, `-P`, `-p`) matches the popular `gorcon/rcon-cli` and similar Source-RCON CLIs; users will need to install it separately on the host (the image does not ship a host-side RCON client).
- The 6 GB RAM / 50 GB disk recommendation is a reasonable lower bound for TheIsland; busier servers / Ragnarok / heavily-modded clusters will need substantially more.
