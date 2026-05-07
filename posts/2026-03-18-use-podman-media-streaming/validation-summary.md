# Validation Summary: How to Use Podman for Media Streaming

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Jellyfin
- Plex Media Server
- Navidrome
- Immich
- Audiobookshelf
- Radarr
- Sonarr
- systemd Quadlet

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `stats` reference: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman Quadlet reference: https://docs.podman.io/en/v5.4.2/markdown/podman-systemd.unit.5.html
- Jellyfin container installation docs: https://jellyfin.org/docs/general/installation/container/
- Jellyfin monitoring docs: https://jellyfin.org/docs/general/post-install/networking/advanced/monitoring/
- Jellyfin Intel GPU docs: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
- Jellyfin NVIDIA GPU docs: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/nvidia/
- Plex official container README: https://github.com/plexinc/pms-docker
- Navidrome Docker install docs: https://www.navidrome.org/docs/installation/docker/
- Navidrome configuration options: https://www.navidrome.org/docs/usage/configuration/options/
- Navidrome monitoring docs: https://www.navidrome.org/docs/usage/integration/monitoring/
- Immich install docs: https://docs.immich.app/install
- Immich requirements: https://docs.immich.app/install/requirements
- Immich environment variables: https://docs.immich.app/install/environment-variables
- Immich official release compose file reference: https://github.com/immich-app/immich/blob/main/docker/docker-compose.yml
- Audiobookshelf docs: https://www.audiobookshelf.org/docs/
- LinuxServer Radarr image docs: https://docs.linuxserver.io/images/docker-radarr/
- LinuxServer Sonarr image docs: https://docs.linuxserver.io/images/docker-sonarr/

## Issues Found
- The Navidrome example used outdated or invalid environment variables. `ND_SCANSCHEDULE` was changed to `ND_SCANNER_SCHEDULE`, the hourly value was updated to `@every 1h`, and the unsupported `ND_ENABLETRANSCODING` variable was removed.
- The Jellyfin NVIDIA example assumed CDI-based GPU passthrough without saying so, and it used a less specific device example. I updated the text to mention the NVIDIA toolkit/CDI requirement, changed the device example to `nvidia.com/gpu=0`, restored the cache volume, and clarified that `--security-opt=label=disable` is only needed on older `container-selinux` releases.
- The Jellyfin Intel Quick Sync section was missing the SELinux requirement documented by Jellyfin for `/dev/dri` access. I added the `setsebool` note so the command better matches how the deployment works on SELinux systems.
- The Immich section was materially outdated. The example used an older port mapping, older database image assumptions, and an obsolete simplified service layout. I replaced the broken commands with a note that current Immich production deployments should follow the release-provided Compose stack and then be adapted to Podman if desired.
- The Radarr and Sonarr images used older registry names. I updated them to the current LinuxServer registry paths at `lscr.io`.
- The health-check script relied on undocumented or unstable service-specific endpoints for several apps. I changed it to accept any `2xx` or `3xx` response and switched the non-Jellyfin checks to the services' main URLs.
- The conclusion overstated that the stack was running in rootless containers. I softened that to “containers” because the post does not consistently configure every example as rootless.

## Review Notes
- The post is technically relevant and remains a valid code-focused guide after correction.
- Several examples still use `:latest` tags. That is technically valid, but pinning image versions would make the post more reproducible and reduce drift over time.
- Immich currently documents Docker Compose as the recommended production deployment path. Podman deployments are possible, but they are not covered as a first-party simple `podman run` workflow in the current official docs.
