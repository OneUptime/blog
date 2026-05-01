# Validation Summary: How to Deploy a Palworld Server via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Palworld dedicated server
- Portainer
- Docker Compose
- Docker volumes
- SteamCMD

## Sources Consulted
- Palworld Server Guide configuration reference: https://docs.palworldgame.com/settings-and-operation/configuration/
- Palworld Server Guide REST API settings schema: https://docs.palworldgame.com/api/rest-api/settings/
- `thijsvanloef/palworld-server-docker` documentation: https://github.com/thijsvanloef/palworld-server-docker
- Docker Compose `version` and `name` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Portainer Edge Jobs documentation: https://docs.portainer.io/2.33-lts/user/edge/jobs

## Issues Found
- The Compose example used the top-level `version: "3.8"` field, which Docker now documents as obsolete. I removed it to match the current Compose specification.
- The stack example used `DAY_TIME_SPEED_RATE` and `NIGHT_TIME_SPEED_RATE`, but this image expects `DAYTIME_SPEEDRATE` and `NIGHTTIME_SPEEDRATE`. I corrected both variable names.
- The post instructed readers to edit `PalWorldSettings.ini` directly, but the image documentation states that generated settings can be overwritten on startup and that edits must be made while the server is stopped. I updated the instructions to stop the container first and set `DISABLE_GENERATE_SETTINGS=true` before editing.
- The sample `PalWorldSettings.ini` values for server name, description, passwords, and player count conflicted with the stack example. I aligned those values so the manual configuration step matches the deployed stack.
- The backup example mounted `palworld-data` by name, but Compose normally scopes named volumes unless an explicit name is set. I added `name: palworld-data` to the volume definition so the backup command targets the correct volume.
- The backup step implied Portainer Edge Jobs were generally available, but Portainer documents them as requiring Edge Compute and only supporting Docker Standalone environments that use `/etc/cron.d`. I added that constraint to the instructions.

## Review Notes
- The post uses `thijsvanloef/palworld-server-docker:latest`. That is valid, but future image releases can change defaults or environment variables; pinning a specific tag would improve reproducibility in a future revision.
- Portainer documents Edge Jobs as a beta feature in the cited documentation.
