# Validation Summary: How to Run a 7 Days to Die Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- 7 Days to Die dedicated server
- vinanrra/7dtd-server Docker image
- LinuxGSM
- XML server configuration
- Telnet server console

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy resources specification: https://docs.docker.com/reference/compose-file/deploy/
- vinanrra/Docker-7DaysToDie README: https://github.com/vinanrra/Docker-7DaysToDie
- vinanrra/Docker-7DaysToDie usage docs: https://github.com/vinanrra/Docker-7DaysToDie/blob/master/docs/usage.md
- vinanrra/Docker-7DaysToDie parameters docs: https://github.com/vinanrra/Docker-7DaysToDie/blob/master/docs/parameters.md
- vinanrra/Docker-7DaysToDie backup docs and scripts: https://github.com/vinanrra/Docker-7DaysToDie/blob/master/docs/backups.md
- vinanrra/Docker-7DaysToDie mod support docs: https://github.com/vinanrra/Docker-7DaysToDie/blob/master/docs/mods_support.md
- vinanrra/Docker-7DaysToDie Dockerfile and entrypoint scripts: https://github.com/vinanrra/Docker-7DaysToDie/blob/master/Dockerfile
- Official 7 Days to Die Wiki, serverconfig.xml: https://7daystodie.wiki.gg/wiki/Server:serverconfig.xml
- Official 7 Days to Die Wiki, serveradmin.xml: https://7daystodie.wiki.gg/wiki/Server:serveradmin.xml
- Official 7 Days to Die Wiki, command console: https://7daystodie.wiki.gg/wiki/Command_Console

## Issues Found
- The Compose example used unsupported gameplay environment variables for `vinanrra/7dtd-server`. Replaced them with documented container variables and moved gameplay configuration to `sdtdserver.xml` properties.
- `START_MODE` meanings were incorrect. Updated the example to use `START_MODE: 1` for normal startup and `START_MODE: 3` for update-and-start.
- The timezone variable was incorrect for this image. Changed `TZ` to the documented `TimeZone`.
- The volume layout did not match the image documentation. Replaced named volumes with documented bind mounts for saves, LinuxGSM config, server files, logs, and backups.
- The Compose file used obsolete top-level `version`. Removed it.
- Port documentation missed required UDP ports and mislabeled optional web ports. Added 26901/26902 forwarding guidance and port 8082 for the Alloc Fixes map GUI.
- The admin XML snippet used the wrong element and placed a comment before the XML declaration. Changed `<users>` to `<admins>` and moved the XML declaration first.
- World generation and blood moon snippets used Compose environment syntax even though those are `serverconfig.xml` properties. Replaced them with XML property snippets.
- The documented world-size list was too narrow. Updated it to the serverconfig rule: multiples of 2048 from 2048 through 16384.
- Backup and restore commands relied on Telnet piping and `docker cp` into a removed Compose container. Replaced them with the image's backup script and a bind-mount restore workflow.
- The `give` console command was presented as unconditional even though it is provided by Alloc Fixes. Added a caveat to the command comment.
- The manual mod mount path was wrong for this image. Changed it to `/home/sdtdserver/serverfiles/Mods`.
- Cleanup instructions implied `docker compose down -v` would delete bind-mounted world data. Updated the note to state that bind-mounted data remains on the host.

## Review Notes
The Compose snippet was checked with `docker compose config --quiet`. `xmllint` was not available locally, so XML snippets were reviewed manually against the referenced 7 Days to Die configuration examples.
