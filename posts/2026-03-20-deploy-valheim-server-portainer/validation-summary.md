# Validation Summary: How to Deploy a Valheim Server via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Valheim dedicated server
- Portainer
- Docker Compose
- `ghcr.io/community-valheim-tools/valheim-server`
- Valheim Plus
- BepInEx

## Sources Consulted
- Valheim official dedicated server guide: https://valheim.com/support/a-guide-to-dedicated-servers/
- Community Valheim server container documentation: https://github.com/community-valheim-tools/valheim-server-docker
- Valheim Plus upstream documentation: https://github.com/valheimPlus/ValheimPlus
- Valheim Plus sample configuration: https://raw.githubusercontent.com/valheimPlus/ValheimPlus/master/valheim_plus.cfg
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` field status: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The image reference used an older container name. I updated it to `ghcr.io/community-valheim-tools/valheim-server:latest`, which is the current upstream image documented by the project.
- The post used legacy update and backup variables (`UPDATE_INTERVAL` and `BACKUPS_INTERVAL`). I replaced them with the current `UPDATE_CRON` and `BACKUPS_CRON` settings documented by the container image.
- The post described `2458/udp` as a required query port. I corrected this to note that Valheim’s default server ports are `2456-2457/udp`, and `2458/udp` is only needed for crossplay or certain mods that use `gameport+2`.
- The admin and banned list paths were incorrect. I changed them from `/config/valheim/...` to `/config/...`, which is where the container creates those files.
- The permission file guidance said to use raw 64-bit Steam IDs. I updated it to the current Valheim `Platform_UserID` format used in `adminlist.txt` and `bannedlist.txt`.
- The Valheim Plus config path was wrong for this container layout. I corrected it to `/config/valheimplus/valheim_plus.cfg`.
- The Valheim Plus example used incorrect or misleading keys. I changed `serverSyncHotkeys` to `serverSyncsConfig`, changed `baseMaxCarryWeight` to `baseMaximumWeight`, and clarified the `enforceMod=false` comment so it matches Valheim Plus behavior.
- The monitoring section included unverified sample log lines. I reduced it to the official startup confirmation message, `Game server connected`.

## Review Notes
- The container image still supports `VALHEIM_PLUS=true`, but its documented default for `VALHEIM_PLUS_REPO` points to the community-maintained `Grantapher/ValheimPlus` fork rather than the older original Valheim Plus release line.
- The post still uses the `latest` image tag. That is technically valid, but pinning a specific image tag would make the deployment more reproducible.
