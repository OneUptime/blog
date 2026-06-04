# Validation Summary: How to Run a Terraria Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Terraria dedicated server
- TShock
- TShock REST API
- Docker volumes and port publishing
- Cron-based backups

## Sources Consulted
- Docker Docs: Compose file reference, https://docs.docker.com/reference/compose-file/
- Docker Docs: Version top-level element, https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose Deploy Specification, https://docs.docker.com/reference/compose-file/deploy/
- Docker Hub: ryshe/terraria image overview, https://hub.docker.com/r/ryshe/terraria/
- Official Terraria Wiki: Command-line parameters, https://terraria.wiki.gg/wiki/Command-line_parameters
- TShock Docs: Command Line Parameters, https://tshock.readme.io/docs/command-line-parameters
- TShock Docs: Setting Up Your Server, https://tshock.readme.io/docs/setting-up-your-server
- TShock Docs: Advanced User Management, https://tshock.readme.io/docs/advanced-user-management
- TShock Docs: Config Settings, https://tshock.readme.io/docs/config-settings
- TShock Docs: REST API Endpoints, https://tshock.readme.io/reference/rest-api-endpoints

## Issues Found
- The Docker examples mounted worlds at `/world`, but the `ryshe/terraria` image documentation uses `/root/.local/share/Terraria/Worlds` for persisted world files. Updated the volume mounts, `-world` paths, backup copy commands, and multi-world examples.
- The Compose snippets used the obsolete top-level `version: "3.8"` field. Removed it so the examples use the current Compose Specification format.
- The `-secure` option was shown as `-secure 1` and described as a `0` or `1` option. Terraria documents `-secure` as a flag, so the examples and flag table were corrected.
- The post used `docker exec -i terraria-server send ...`, but neither Docker nor the referenced TShock documentation provides a `send` executable for this image. Replaced those examples with attached-console commands or REST API calls.
- The TShock setup-code lookup searched only for `setup-code`. TShock documentation describes an auth code in the console, so the log search was changed to a case-insensitive `auth` search.
- The REST API section implied the API and token creation command were immediately available. TShock documents `RestApiEnabled` as disabled by default and token creation through `/v2/token/create`, so the section now tells readers to enable REST in `config.json`, restart, and create a token through the documented endpoint.
- The plugin mount path used `/world/ServerPlugins`, but the `ryshe/terraria` image documentation exposes `/plugins` for plugin mounts. Updated the plugin volume examples.
- The backup and graceful shutdown examples depended on the invalid `send` helper. Updated them to use documented TShock REST endpoints for saving the world and stopping the server.
- The world-corruption section stated TShock automatically creates `.bak` world files. TShock documents backup storage under `tshock/backups` when backups are enabled, with `BackupInterval` defaulting to `0`, so the section now describes enabled backups and uses the documented backup directory.

## Review Notes
The post is technically relevant and salvageable. The remaining examples assume the reader has enabled the TShock REST API before using REST-based save, backup, and shutdown commands.
