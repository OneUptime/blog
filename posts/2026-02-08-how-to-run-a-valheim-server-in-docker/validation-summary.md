# Validation Summary: How to Run a Valheim Server in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose v2
- Valheim dedicated server
- SteamCMD
- community-valheim-tools Valheim server Docker image
- BepInEx

## Sources Consulted
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, docker compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Valheim official dedicated server guide: https://valheim.com/support/a-guide-to-dedicated-servers/
- community-valheim-tools/valheim-server-docker README: https://github.com/community-valheim-tools/valheim-server-docker

## Issues Found
- The post used the older `lloesche/valheim-server` image name. Updated the examples and summary to `ghcr.io/community-valheim-tools/valheim-server`, matching the current maintained image documentation.
- The Docker Compose example included the obsolete top-level `version: "3.8"` field. Removed it because current Compose uses the Compose Specification and treats `version` as informational/obsolete.
- The post stated that Valheim uses three consecutive UDP ports by default and exposed `2456-2458/udp`. Updated the default examples to expose `2456-2457/udp`; Valheim's official guide documents the configured port and port+1 as the default Steam backend range. Left a note that UDP `2458` should be exposed when enabling crossplay.
- The crossplay environment variable was listed as `ENABLE_CROSSPLAY`. Updated it to `CROSSPLAY`, which is the variable documented by the container image.
- The direct connection instructions said to use port `2457`. Updated them to use `2456` or omit the port when using the default, matching the container and Valheim server documentation.
- The admin instructions used raw Steam ID wording. Updated them to refer to Platform User IDs from the server log or F2 panel, matching the official Valheim dedicated server guide.
- The post said only to press F5 for admin commands. Added the current caveat that recent Valheim clients may need the `-console` launch option for F5 to open the console.

## Review Notes
The examples were not executed against a live Valheim server because that would require downloading the game server image and Steam server binaries. The Docker and Compose commands are syntactically valid, and the configuration keys were checked against the current image and official Valheim documentation.
