# Validation Summary: How to Deploy Sonarr via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Sonarr
- Portainer
- Docker Compose / Portainer Stacks
- LinuxServer.io Sonarr container image
- HTTP monitoring

## Sources Consulted
- Sonarr official site and Docker guidance: https://sonarr.tv/
- Sonarr API docs: https://sonarr.tv/docs/api/
- Sonarr FAQ (Servarr Wiki): https://wiki.servarr.com/sonarr/faq
- Sonarr source: `PingController` — https://github.com/Sonarr/Sonarr/blob/develop/src/Sonarr.Http/Ping/PingController.cs
- Sonarr source: `HealthController` — https://github.com/Sonarr/Sonarr/blob/develop/src/Sonarr.Api.V3/Health/HealthController.cs
- LinuxServer.io Sonarr image docs: https://docs.linuxserver.io/images/docker-sonarr/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add

## Issues Found
1. The original Compose example mounted `/downloads` and `/tv` as separate bind mounts and claimed that layout enabled hardlinks. Sonarr’s Docker guidance says that `/tv` and `/downloads` style mounts are treated as different filesystems inside the container and prevent hardlinks and fast moves. I changed the example to mount a single common parent path (`/mnt/data:/data`) and updated the library path accordingly.

2. The post used `linuxserver/sonarr:latest`. LinuxServer’s current documentation uses `lscr.io/linuxserver/sonarr:latest`, so I updated the image reference to the current official form.

3. The post said Sonarr would immediately start searching for missing episodes after adding a series. Sonarr’s FAQ states it does not regularly search old missing episodes unless you use the **Start search for missing** option. I corrected the add-series instructions and the follow-up explanation.

4. The monitoring section treated `/api/v3/health` as a simple uptime check and implied non-200 responses meant Sonarr was down. Sonarr’s API/source show `/api/v3/health` returns health warnings as JSON, while `/ping` is the dedicated lightweight availability endpoint. I changed the guidance to use `/ping` for uptime and `/api/v3/health` for warning details with an API key.

## Review Notes
- The Portainer stack flow in the post is still valid for current Portainer releases.
- The post assumes the download client is either on the same Docker network as Sonarr or otherwise reachable by host/IP. I clarified the same-network case in the download client instructions.
