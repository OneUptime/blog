# Validation Summary: How to Self-Host a Media Server Stack with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Docker networking
- Jellyfin
- Sonarr
- Radarr
- Prowlarr
- qBittorrent
- Jellyseerr
- Traefik
- GPU transcoding with Intel Quick Sync / NVIDIA

## Sources Consulted
- Portainer documentation: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Docker documentation: Compose file `version` top-level element — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: GPU support in Compose — https://docs.docker.com/compose/how-tos/gpu-support/
- Docker documentation: `docker container ls` / `docker ps` network filter — https://docs.docker.com/reference/cli/docker/container/ls
- Jellyfin documentation: Container installation — https://jellyfin.org/docs/general/installation/container/
- Jellyfin documentation: Networking — https://jellyfin.org/docs/general/post-install/networking/
- Jellyfin documentation: Hardware acceleration overview — https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/
- Jellyfin documentation: Intel GPU hardware acceleration — https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
- LinuxServer.io documentation: Sonarr image — https://docs.linuxserver.io/images/docker-sonarr/
- LinuxServer.io documentation: Radarr image — https://docs.linuxserver.io/images/docker-radarr/
- LinuxServer.io documentation: Prowlarr image — https://docs.linuxserver.io/images/docker-prowlarr/
- LinuxServer.io documentation: qBittorrent image — https://docs.linuxserver.io/images/docker-qbittorrent/
- Jellyseerr documentation: Docker installation — https://docs.jellyseerr.dev/getting-started/docker
- Servarr Wiki: Docker guide — https://wiki.servarr.com/docker-guide
- Servarr Wiki: Prowlarr quick start guide — https://wiki.servarr.com/prowlarr/quick-start-guide
- Servarr Wiki: Sonarr quick start guide — https://wiki.servarr.com/sonarr/quick-start-guide
- Servarr Wiki: Radarr quick start guide — https://wiki.servarr.com/radarr/quick-start-guide
- Traefik documentation: Docker routing configuration — https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik documentation: Docker exposure example — https://doc.traefik.io/traefik/master/expose/docker/

## Issues Found
1. **Compose file used the obsolete top-level `version` field**: Current Docker Compose documentation marks `version` as obsolete and only informative. I removed `version: "3.8"` from the stack example.
2. **Jellyfin container permissions were configured with unsupported environment variables**: The official `jellyfin/jellyfin` image documents `user: uid:gid`, not LinuxServer-style `PUID` / `PGID` variables. I replaced those environment variables with `user: "1000:1000"`.
3. **The service flow diagram was technically incorrect**: The original diagram placed qBittorrent before Sonarr/Radarr and Prowlarr. In practice, request/automation flows through Jellyseerr, Sonarr/Radarr, and Prowlarr before sending releases to qBittorrent. I corrected the architecture diagram.
4. **The qBittorrent and Sonarr/Radarr path configuration was incomplete**: Sonarr and Radarr were mapped to `/opt/media/downloads/complete`, but the post never told readers to configure qBittorrent to save completed downloads there. I added the required completed/incomplete path settings and also added `/opt/jellyseerr` to the host directory setup because it is bind-mounted in the compose file.
5. **The Intel hardware transcoding example used a hard-coded host group ID**: Jellyfin’s official Intel hardware acceleration guidance requires using the host’s actual render group ID, which varies by system. I replaced the fixed `109` value with a placeholder plus the host lookup command.
6. **The NVIDIA hardware transcoding snippet was too vague for current Compose GPU reservations**: I updated it to use the current Docker Compose reservation syntax with an explicit NVIDIA driver and GPU reservation fields.
7. **The Traefik labels omitted explicit TLS enablement**: Traefik’s Docker examples include enabling TLS on the router when serving on a secure entrypoint. I added `traefik.http.routers.jellyfin.tls=true`.
8. **The monitoring command assumed the wrong Docker network name**: Compose/Portainer network names are normally prefixed with the project or stack name. I changed the example to `docker ps --filter "network=<stack-name>_media_network"`.
9. **The Jellyfin HTTPS port comment implied HTTPS was immediately active**: Jellyfin’s documentation notes that HTTPS is disabled by default until you configure a certificate. I clarified that the `8920` mapping is optional and only applies if HTTPS is enabled inside Jellyfin.

## Review Notes
- The post is now technically correct, but the Servarr Docker guide recommends a unified `/data` mount layout instead of separate `/tv`, `/movies`, and `/downloads` mounts. The current layout will still work, but it can prevent hardlinks and atomic moves, causing copy-and-delete imports instead.
- Jellyfin’s networking documentation recommends terminating HTTPS at the reverse proxy rather than inside Jellyfin itself. Leaving port `8920` mapped is acceptable, but many deployments will rely only on Traefik for TLS.
- Portainer’s stack workflow is supported by Portainer documentation, but the Servarr Docker guide generally prefers managing these applications with Compose directly rather than through Portainer.
