# Validation Summary: How to Deploy a Terraria Server via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Terraria dedicated server
- TShock
- Docker Compose
- Portainer
- Docker volumes
- Shell scripting

## Sources Consulted
- Docker Hub image overview for `ryshe/terraria`: https://hub.docker.com/r/ryshe/terraria
- Image source README: https://github.com/ryansheehan/terraria/blob/master/README.md
- Image bootstrap script: https://github.com/ryansheehan/terraria/blob/master/tshock/bootstrap.sh
- Image Dockerfile: https://github.com/ryansheehan/terraria/blob/master/tshock/Dockerfile
- TShock command-line parameters: https://github.com/Pryaxis/TShock/blob/general-devel/docs/command-line-parameters.md
- TShock setup flow and setup-code handling: https://github.com/Pryaxis/TShock/blob/general-devel/TShockAPI/TShock.cs
- TShock setup command behavior: https://github.com/Pryaxis/TShock/blob/general-devel/TShockAPI/Commands.cs
- TShock config parsing and `Settings` wrapper: https://github.com/Pryaxis/TShock/blob/general-devel/TShockAPI/FileTools.cs
- TShock config fields: https://github.com/Pryaxis/TShock/blob/general-devel/TShockAPI/Configuration/TShockConfig.cs
- Docker Compose named volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer container logs docs: https://docs.portainer.io/user/docker/containers/logs
- Portainer backup scope docs: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer volume browser docs: https://docs.portainer.io/user/docker/volumes/browse
- Official Terraria Wiki command-line parameters: https://terraria.wiki.gg/wiki/Command-line_parameters
- Official Terraria Wiki dedicated server reference: https://terraria.wiki.gg/wiki/Dedicated_Server

## Issues Found
- The stack example used lowercase environment variables such as `world`, `worldname`, `worldsize`, and `autocreate`. The current `ryshe/terraria:tshock-latest` image documents `WORLD_FILENAME` and `CONFIGPATH`, and expects startup flags to be passed as container arguments. I replaced the invalid env vars with the supported env vars and moved server creation/runtime settings into `command`.
- The original stack mounted plugins at `/plugins`, but current image/runtime behavior loads plugins from `ServerPlugins`. I changed the volume mount to `/tshock/ServerPlugins` so added DLLs are loaded directly.
- The original port mapping only published TCP. Updated the example to publish both `7777/tcp` and `7777/udp`, matching current Terraria hosting guidance.
- The original named volumes would be stack-scoped by Compose/Portainer, which would break later examples that refer to `terraria-worlds` and `terraria-plugins` by exact name. I added explicit `name:` fields so the later `docker run` and host-volume examples refer to the correct volumes.
- The TShock config example used the older flat JSON layout. Current TShock config handling uses a top-level `Settings` object, so I wrapped the sample accordingly.
- The TShock admin setup flow was outdated. Current TShock emits a `/setup <code>` prompt, then expects `/user add <username> <password> owner`, `/login`, and a final `/setup` to disable the bootstrap flow. I corrected the log sample and commands.
- The plugin download URLs in the post returned `404` and were not reliable current examples. I replaced them with a generic, technically correct DLL copy workflow into the mounted `ServerPlugins` volume.
- The backup section incorrectly implied that Portainer backs up Docker volumes or provides a general scheduled-job flow for this use case. Portainer backups cover Portainer state, not container volumes. I changed the text to a host-side scheduled task and kept the backup script.
- The tar command archived `/worlds` as an absolute path. I adjusted it to `-C / worlds` to produce a cleaner archive.

## Review Notes
- `version: "3.8"` still works, but modern Docker Compose treats the top-level `version` field as obsolete.
- The Step 4 host path example assumes a standard Linux Docker data root at `/var/lib/docker/volumes`. If Docker uses a custom data root, the actual host path will differ.
- The Terraria wiki command-line reference notes that some flag documentation is derived from 1.4.4.9 source while current Terraria is 1.4.5.6, but the specific flags used here align with current TShock documentation and current image behavior.
