# Validation Summary: How to Deploy an ARK Server via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- UFW
- ARK: Survival Evolved dedicated server hosting

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker `logs` CLI reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `stats` CLI reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker `restart` CLI reference: https://docs.docker.com/reference/cli/docker/container/restart/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- `ich777` SteamCMD image repository, `arkse` branch: https://github.com/ich777/docker-steamcmd-server/tree/arkse
- `ich777` SteamCMD image repository, `asa` branch: https://github.com/ich777/docker-steamcmd-server/tree/asa
- ARK dedicated server setup reference: https://ark.wiki.gg/wiki/Dedicated_server_setup
- ARK server configuration reference: https://ark.wiki.gg/wiki/Server_configuration
- UFW man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html

## Issues Found
- The post claimed the example covered both ARK: Survival Evolved and ARK: Survival Ascended, but the documented `ich777` image uses separate `arkse` and `asa` tags with different setup requirements. I corrected the post to accurately cover ARK: Survival Evolved with `ich777/steamcmd:arkse`.
- The stack used a non-documented image tag (`ich777/steamcmd:arksurvivalevolved`), malformed Compose `ports` syntax, and malformed Compose `environment` syntax. I replaced them with a valid Compose configuration using the documented image tag and environment variables from the image's own documentation.
- The volume mount path was incorrect for this image. I changed persistence and backup mounts from `/game-data` to `/serverdata/serverfiles`, which is the documented server data path used by the container.
- The original firewall command used invalid UFW syntax and the wrong port set. I replaced it with UFW-supported rules for `7777/udp`, `7778/udp`, and `27015/udp`, plus optional `27020/tcp` for RCON based on ARK server documentation.
- The backup examples archived the wrong path and the stack command used shell variables in a way that Compose would interpolate incorrectly. I updated both backup examples to archive `ShooterGame/Saved`, added a guard for first-start timing, and escaped variables correctly for Compose with `$$`.
- The automatic update section used unsupported variables (`AUTO_UPDATE`, `AUTO_REBOOT`, `CRON_AUTO_UPDATE`) for this image. I replaced that guidance with the documented behavior for this image family: restart or redeploy the container to apply updates.
- The administration section referenced unsupported or misleading commands (`docker attach` as a server console and `/restart-server.sh`). I replaced those with supported commands for shell access, log inspection, stats, and container restart.
- The monitoring guidance included an inaccurate claim about "configuring server RAM to 70-80% of available." I rewrote it as host-level resource guidance that matches how Docker actually manages the container.

## Review Notes
- The post is now technically accurate for ARK: Survival Evolved with the `ich777/steamcmd:arkse` image.
- ARK: Survival Ascended should be covered separately if desired. The `ich777/steamcmd:asa` image has different defaults and additional host requirements, including a higher `vm.max_map_count` setting.
