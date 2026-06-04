# Validation Summary: How to Run a Factorio Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- factoriotools/factorio Docker image
- Factorio dedicated/headless server
- Factorio server JSON configuration
- Factorio RCON
- Factorio mods and saves

## Sources Consulted
- Factorio Wiki: Multiplayer dedicated/headless server setup - https://wiki.factorio.com/Multiplayer
- Factorio Wiki: Command line parameters - https://wiki.factorio.com/Command_line_parameters
- Factorio Wiki: Console commands - https://wiki.factorio.com/Console
- Wube factorio-data: server-settings.example.json - https://github.com/wube/factorio-data/blob/master/server-settings.example.json
- Wube factorio-data: map-gen-settings.example.json - https://github.com/wube/factorio-data/blob/master/map-gen-settings.example.json
- factoriotools/factorio Docker Hub README - https://hub.docker.com/r/factoriotools/factorio/
- factoriotools/factorio-docker README and entrypoint - https://github.com/factoriotools/factorio-docker
- Docker Docs: Compose file version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose volumes - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: docker cp - https://docs.docker.com/reference/cli/docker/container/cp/

## Issues Found
- The post described `factoriotools/factorio` as the official Factorio Docker image maintained by the Factorio team. The image is community-maintained, so the description was corrected.
- The post said a Factorio account is needed for downloading the server. The headless server image handles server download; credentials are needed for public server listing and mod downloads, so the prerequisite was corrected.
- The front matter description promised automated backups, but the guide only shows manual backup commands. The description now says backups.
- The Compose example used the obsolete top-level `version` property. Docker Compose now treats this as informative and warns that it is obsolete, so it was removed.
- The Compose example used `RCON_PASSWORD`, which is not a supported `factoriotools/factorio` environment variable. The image reads RCON credentials from `/factorio/config/rconpw`; the unsupported variable was removed and the RCON instructions now read the generated password.
- The Compose example set `SAVE_NAME` without `LOAD_LATEST_SAVE=false`. The image loads the latest save by default, so the example now disables latest-save loading when a named save is intended.
- The configuration section implied all player-list files are generated automatically. The image creates the main config files, while admin/ban list files may need to be created when used, so the wording was clarified.
- The `map-gen-settings.json` example used outdated or incorrect current keys, including top-level `water`, `terrain_segmentation`, `control-setting:*` property names, and `richness` on trees/enemy-base. The example was updated to match Wube's current `map-gen-settings.example.json` structure.
- The RCON command example used `/server-message`, which is not listed in the official Factorio console command reference. It was changed to the documented `/shout` command.
- The save-loading section said to set only `SAVE_NAME`. It now also sets `LOAD_LATEST_SAVE=false`, matching the image documentation.

## Review Notes
The post is now technically valid for the current `factoriotools/factorio` image and Factorio 2.x example configuration files. Future improvements could mention host bind-mount ownership for UID 845 when using host directories instead of named volumes, but the current named-volume examples avoid that setup requirement.
