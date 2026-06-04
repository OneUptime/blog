# Validation Summary: How to Run a Satisfactory Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose
- wolveix/satisfactory-server Docker image
- Satisfactory dedicated server
- SteamCMD
- Linux shell commands and cron

## Sources Consulted
- Official Satisfactory Wiki, Dedicated servers: https://satisfactory.wiki.gg/wiki/Dedicated_servers
- Official Satisfactory Wiki, Dedicated servers/Configuration files: https://satisfactory.wiki.gg/wiki/Dedicated_servers/Configuration_files
- wolveix/satisfactory-server README: https://github.com/wolveix/satisfactory-server/blob/main/README.md
- wolveix/satisfactory-server run.sh: https://github.com/wolveix/satisfactory-server/blob/main/run.sh
- wolveix/satisfactory-server init.sh: https://github.com/wolveix/satisfactory-server/blob/main/init.sh
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The Docker examples only exposed TCP/UDP 7777. Current Satisfactory dedicated servers also require TCP 8888 for reliable messaging, so the quick start, Compose, troubleshooting, and multi-server examples were updated.
- The Compose example used obsolete Satisfactory ports and environment variables (`SERVERQUERYPORT`, `BEACONPORT`, `GAMEPORT`). The wolveix image uses `SERVERGAMEPORT` and `SERVERMESSAGINGPORT`, so the configuration was corrected.
- The post configured auto-pause, autosave interval, and network quality as container environment variables. These are not supported environment variables for the wolveix image; auto-pause and autosave interval should be managed through the in-game Server Manager, and network quality is a client-side setting.
- The `STEAMBETA` and `DISABLESEASONALEVENTS` comments were inaccurate. They were corrected to describe the experimental branch and seasonal event behavior.
- The admin password reset guidance incorrectly suggested modifying INI files. The post now describes stopping the server and removing the `ServerSettings.7777.sav` settings save so the server can be claimed again.
- Save management paths were updated to the wolveix image's persistent `/config/saved/server` path instead of the internal gamefile save path.
- The backup cleanup command could remove more than intended because it searched all directories under the backup root. It now limits cleanup to first-level `saves-*` backup directories.
- The post described Satisfactory as receiving updates during early access. Satisfactory is no longer an early access title, so the wording was updated.
- The Docker Compose `version: "3.8"` key was removed because current Compose treats the top-level `version` field as obsolete and informational.

## Review Notes
The guide is technically relevant and remains a useful Docker tutorial after correcting the current Satisfactory 1.1 port requirements and the wolveix image configuration surface. Resource recommendations remain approximate because server memory usage depends heavily on factory size, player count, and save complexity.
