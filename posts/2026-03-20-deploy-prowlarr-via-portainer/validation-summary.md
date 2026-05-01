# Validation Summary: How to Deploy Prowlarr via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Docker networking
- Prowlarr
- Sonarr
- Radarr
- FlareSolverr
- OneUptime

## Sources Consulted
- LinuxServer.io: Prowlarr image documentation — https://docs.linuxserver.io/images/docker-prowlarr/
- Prowlarr Quick Start Guide (Servarr Wiki) — https://wiki.servarr.com/prowlarr/quick-start-guide
- Prowlarr Settings (Servarr Wiki) — https://wiki.servarr.com/prowlarr/settings
- Prowlarr FAQ (Servarr Wiki) — https://wiki.servarr.com/prowlarr/faq
- Docker Docs: Networking in Compose — https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- FlareSolverr GitHub README — https://github.com/FlareSolverr/FlareSolverr

## Issues Found
- The Compose example used the obsolete top-level `version` key and the older `linuxserver/prowlarr:latest` image reference. I removed `version: "3.8"` and updated the image to `lscr.io/linuxserver/prowlarr:latest` to match current Docker Compose and LinuxServer documentation.
- The post said Sonarr and/or Radarr should be on the same Docker network, but the Prowlarr stack example did not actually attach Prowlarr to a shared external network. I added an external `media_network` example and a note to replace it with the reader's existing shared network name so `prowlarr`, `sonarr`, and `radarr` hostnames work across Portainer-managed stacks.
- The app sync section implied that all indexers propagate to every connected application. I corrected this to reflect Prowlarr's documented behavior: indexers sync to applications based on supported categories/capabilities, and I clarified the Sonarr/Radarr application server examples in the settings snippet.
- The FlareSolverr section used the wrong Prowlarr menu path and omitted the required tag matching behavior. I changed the instructions to `Settings > Indexer Proxies`, added the shared network attachment for the FlareSolverr service, and documented that the proxy must share tags with the target indexers and is only used when Cloudflare is detected.

## Review Notes
- The Portainer deployment steps themselves were technically fine and aligned with Portainer's current stack workflow.
- The monitoring guidance is reasonable: when Sonarr/Radarr are configured to use Prowlarr-managed indexers, Prowlarr availability directly affects search functionality.
- Docker was not installed in this review environment, so I could not run `docker compose config`; the revised stack YAML was syntax-checked with a YAML parser instead.
