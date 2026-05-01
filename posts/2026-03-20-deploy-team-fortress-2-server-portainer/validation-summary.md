# Validation Summary: How to Deploy a Team Fortress 2 Server via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Team Fortress 2 dedicated server
- Portainer
- Docker Compose
- Steam Game Server Login Token
- SourceMod
- MetaMod:Source
- RCON
- `mcrcon`

## Sources Consulted
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Docker Hub, `cm2network/tf2`: https://hub.docker.com/r/cm2network/tf2/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Official TF2 Wiki, Linux dedicated server: https://wiki.teamfortress.com/wiki/Linux_dedicated_server
- Official TF2 Wiki, Dedicated server configuration: https://wiki.teamfortress.com/wiki/Dedicated_server_configuration
- Official TF2 Wiki, Windows dedicated server: https://wiki.teamfortress.com/wiki/Windows_dedicated_server
- AlliedModders Wiki, Installing Metamod:Source: https://wiki.alliedmods.net/Installing_metamod%3Asource
- AlliedModders Wiki, Installing SourceMod: https://wiki.alliedmods.net/index.php?title=Installing_SourceMod
- AlliedModders Wiki, Required Versions (SourceMod): https://wiki.alliedmods.net/Required_Versions_%28SourceMod%29
- SourceMod stable downloads: https://www.sourcemod.net/downloads.php?branch=stable
- MetaMod:Source stable downloads: https://www.metamodsource.net/downloads.php?branch=stable
- Tiiffi `mcrcon` README: https://github.com/Tiiffi/mcrcon

## Issues Found
- The stack example used the obsolete top-level `version` key. I removed it because current Compose documentation marks it as obsolete.
- The TF2 container example was missing `SRCDS_TOKEN`, which the image documentation says is required for a publicly listed and reachable server. I added it.
- The stack used `SRCDS_MAP`, `SRCDS_GAMETYPE`, `SRCDS_GAMEMODE`, and `SRCDS_NET_PUBLIC_ADDRESS`, which are not current documented `cm2network/tf2` environment variables. I replaced `SRCDS_MAP` with `SRCDS_STARTMAP` and removed the unsupported entries.
- The port comments were inaccurate. I corrected them so `27015/tcp` is labeled as RCON, `27015/udp` as TF2 game traffic, and `27020/udp` as SourceTV, matching the official TF2 server docs.
- The post set `SRCDS_PW=join_password_here` in the stack but then made the server public with `sv_password ""` in `server.cfg`. I made the examples consistent by using the same join password in both places and noting that `""` makes the server public.
- The `server.cfg` sample used shell-style `#` comments. I changed those to `//`, which is the correct comment syntax for Source engine config files.
- The MetaMod:Source and SourceMod download commands pointed to stale builds. I updated them to the current stable 1.12 release URLs published by AlliedModders as of 2026-05-01.
- The custom maps example bind-mounted a host directory directly onto `tf/maps`. Docker's bind-mount documentation notes that mounting over an existing non-empty container directory obscures the original contents, so I replaced that example with direct placement into the existing `tf/maps` directory in the TF2 data volume.
- The RCON section installed `mcrcon` but then used the `rcon` command name. I corrected the examples to use `mcrcon`, and I quoted multi-word commands so they are sent as single RCON commands.
- The `mapcycle.txt` example did not clearly identify the correct file location. I updated the text to point to `tf/cfg/mapcycle.txt`, matching the official TF2 server docs.

## Review Notes
- The `cm2network/tf2` image documentation recommends `network_mode: host` for the simplest setup. The corrected post keeps explicit port publishing, which is reasonable for a Portainer stack as long as the documented TF2, RCON, and SourceTV ports are exposed.
- The post still uses `cm2network/tf2:latest`. That is valid, but pinning a specific image tag would make the deployment more reproducible.
- The MetaMod:Source and SourceMod build numbers are accurate as of 2026-05-01 and will need periodic refresh as new stable releases are published.
