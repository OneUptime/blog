# Validation Summary: How to Deploy Sonarr via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Sonarr
- Radarr
- Prowlarr
- qBittorrent
- LinuxServer.io container images

## Sources Consulted
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Define and manage networks in Docker Compose: https://docs.docker.com/reference/compose-file/networks/
- Portainer Docs, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- LinuxServer.io, Sonarr image documentation: https://docs.linuxserver.io/images/docker-sonarr/
- LinuxServer.io, Radarr image documentation: https://docs.linuxserver.io/images/docker-radarr/
- LinuxServer.io, Prowlarr image documentation: https://docs.linuxserver.io/images/docker-prowlarr/
- LinuxServer.io, qBittorrent image documentation: https://docs.linuxserver.io/images/docker-qbittorrent/
- Servarr Wiki, Sonarr Settings: https://wiki.servarr.com/sonarr/settings
- Servarr Wiki, Sonarr FAQ: https://wiki.servarr.com/sonarr/faq
- Servarr Wiki, Prowlarr Settings: https://wiki.servarr.com/prowlarr/settings

## Issues Found
- The post used the top-level Compose `version: "3.8"` key in both YAML snippets. Docker now documents `version` as obsolete and only retained for backward compatibility, so I removed it to avoid current Compose warnings.
- The qBittorrent stack exposed `6881/tcp` and `6881/udp` but did not explicitly set `TORRENTING_PORT=6881`. I added the environment variable to match LinuxServer.io's current compose example and keep the published torrent port explicit.
- The Sonarr setup steps described `qbittorrent` as the container name. In Compose networking, the documented DNS hostname is the service name, so I corrected that wording.

## Review Notes
- The post is technically sound after the fixes: Portainer supports deploying stacks from Compose YAML files, the LinuxServer.io image names and core mappings are valid, and the Sonarr and Prowlarr settings paths match current Servarr documentation.
- The separate `/tvshows` and `/downloads` mounts will work, but LinuxServer.io notes that this easy-start layout can prevent hardlinks and atomic moves. A future revision could document a single shared data root for more efficient imports.
