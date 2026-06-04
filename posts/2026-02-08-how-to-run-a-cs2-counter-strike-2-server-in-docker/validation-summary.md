# Validation Summary: How to Run a CS2 (Counter-Strike 2) Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Counter-Strike 2 dedicated server
- SteamCMD
- Steam Game Server Login Token (GSLT)
- RCON
- Steam Workshop maps

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy resources documentation: https://docs.docker.com/reference/compose-file/deploy/
- joedwards32/cs2 Docker Hub documentation: https://hub.docker.com/r/joedwards32/cs2
- joedwards32/CS2 GitHub repository and example Compose file: https://github.com/joedwards32/CS2
- Valve Developer Community CS2 dedicated server documentation: https://developer.valvesoftware.com/wiki/Counter-Strike_2/Dedicated_Servers
- Steam Game Server Account Management page: https://steamcommunity.com/dev/managegameservers

## Issues Found
- The Compose example used `CS2_GSLT`, but the `joedwards32/cs2` image expects the GSLT in `SRCDS_TOKEN` and converts it to `+sv_setsteamaccount`. Updated the environment variable.
- The Compose example included the obsolete top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.
- Port `27020/udp` was labeled as the RCON port, but the image documents it as CSTV/SourceTV. Updated the comment and removed the extra `27005/udp` mapping that is not part of the image's documented example.
- The post said the first startup downloads roughly 35GB and cleanup removes 35GB+ of files. The image documentation requires at least 60GB of free disk space. Updated the disk-space references to 60GB.
- Several examples used `docker exec cs2-server rcon ...`, but the image does not install an `rcon` executable. Reworded those examples to use an external RCON client or the CS2 client console.
- The workshop example passed `+host_workshop_collection` through `CS2_ADDITIONAL_ARGS`. The image provides `CS2_HOST_WORKSHOP_COLLECTION` and `CS2_HOST_WORKSHOP_MAP` for this. Updated the example to use the dedicated environment variable.
- The game mode comment implied a single numeric value selected Casual, Competitive, Wingman, or Deathmatch. CS2 uses `game_type` and `game_mode` together. Updated the comment to point readers to the table.

## Review Notes
- The main Compose snippet was parsed with the installed Docker Compose CLI after edits.
- Valve's dedicated-server documentation was partially inaccessible through direct local fetch due bot protection, so the review used the indexed Valve documentation result plus the actively maintained `joedwards32/cs2` image documentation and source for container-specific behavior.
