# Validation Summary: How to Deploy a Terraria Server via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- Terraria dedicated server
- ryshe/terraria Docker image
- UFW firewall
- Alpine Linux backup container

## Sources Consulted
- ryshe/terraria Docker Hub repository: https://hub.docker.com/r/ryshe/terraria/
- ryshe/terraria GitHub README and vanilla Dockerfile/bootstrap: https://github.com/ryansheehan/terraria
- Docker Hub tag metadata for ryshe/terraria: https://hub.docker.com/v2/repositories/ryshe/terraria/tags/latest
- Official Terraria dedicated server download and bundled `serverconfig.txt`: https://terraria.org/api/download/pc-dedicated-server/terraria-server-1456.zip
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI logs, stats, attach, exec, and restart references: https://docs.docker.com/reference/cli/docker/container/
- Ubuntu UFW man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks

## Issues Found
- The firewall command used `ufw allow 7777:7777`, which is invalid UFW syntax and failed a local dry-run syntax check with `ERROR: Bad port`. Changed it to `ufw allow 7777/tcp`, matching UFW's documented `port/protocol` syntax and Docker's TCP port publishing.
- The Compose file used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose treats `version` as only informative and emits an obsolete-field warning.
- The stack used `ryshe/terraria:latest`, which currently points to the TShock build, while the post describes a vanilla Terraria dedicated server. Changed the image to `ryshe/terraria:vanilla-latest`.
- The original volume mounted Terraria data at `/game-data`, which is not the world path used by the selected image. Updated the stack to persist `/root/.local/share/Terraria/Worlds`, `/config`, and `/terraria-server/logs`.
- The original `environment` block was invalid Compose syntax because it was a single scalar string, and the variables shown were not supported by the `ryshe/terraria` image. Replaced it with supported Terraria command-line arguments for world creation and max players.
- The always-successful healthcheck (`test: ["CMD", "true"]`) did not validate the game server. Removed it rather than presenting a misleading health status.
- The backup service mounted the wrong data path and was configured with `restart: "no"` despite being a long-running backup loop. Updated it to back up the persisted world volume and restart unless stopped.
- The manual backup command referenced the old `terraria-data` volume and unquoted the host backup path. Updated it to use the explicitly named `terraria-worlds` volume and quote the bind mount path.
- The automatic update environment variables (`AUTO_UPDATE`, `AUTO_REBOOT`, `CRON_AUTO_UPDATE`) are not documented for the selected image. Replaced them with the image's documented pull-and-redeploy update flow.
- The administration section referenced `/restart-server.sh`, which is not provided by the selected image. Replaced it with `docker restart game-server` and documented the supported attached-console `playing` command.
- The security section mentioned a whitelist generically. Adjusted it to password protection, which is supported by Terraria server configuration without requiring an additional TShock-specific setup.

## Review Notes
Docker is not installed in this review environment, so the stack could not be deployed end-to-end locally. The corrected syntax and behavior were reviewed against official Docker documentation, the image source, Docker Hub metadata, the official Terraria server config, and local UFW syntax behavior.

Live filesystem backups can still capture a world while the server is writing to it. For a future hardening pass, consider documenting a save-before-backup workflow or scheduled maintenance window for highly active servers.
