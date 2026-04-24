# Validation Summary: How to Deploy Jellyfin via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Jellyfin
- Intel Quick Sync (QSV)
- NVIDIA NVENC
- Jellyfin plugins

## Sources Consulted
- Jellyfin container documentation: https://jellyfin.org/docs/general/installation/container/
- Jellyfin DLNA documentation: https://jellyfin.org/docs/general/post-install/networking/dlna/
- Jellyfin Intel hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
- Jellyfin NVIDIA hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/nvidia/
- Jellyfin transcoding documentation: https://jellyfin.org/docs/general/post-install/transcoding/
- Jellyfin plugins documentation: https://jellyfin.org/docs/general/server/plugins/
- Jellyfin Open Subtitles plugin documentation: https://jellyfin.org/docs/general/server/plugins/open-subtitles/
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Intro Skipper project README: https://github.com/intro-skipper/intro-skipper

## Issues Found
- The NVIDIA Compose example used `runtime: nvidia` with environment variables only. Current Jellyfin and Docker Compose guidance uses GPU device reservations under `deploy.resources.reservations.devices`, so the example was updated and a host prerequisite note for the NVIDIA driver and NVIDIA Container Toolkit was added.
- The plugin section implied all listed plugins were directly available from the default catalog. Jellyfin's plugin documentation shows that some plugins are third-party and may require adding a plugin repository first, so the wording was corrected.
- The transcoding settings section recommended a fixed `2-4` simultaneous transcodes and implied a hardware-specific thread-count rule. Jellyfin's transcoding documentation instead advises leaving thread count alone unless needed, and the transcode limit depends on available hardware, so those recommendations were corrected.
- The Intel Quick Sync example hardcoded a `video` group GID without noting that it should be checked on the host. The comment was updated to point readers to `getent group video`.

## Review Notes
- The deployment example still uses `network_mode: host`. That is technically valid and is required for DLNA discovery, but Jellyfin's container documentation notes that host networking is optional if DLNA is not needed.
- The post uses the `jellyfin/jellyfin:latest` tag. That is valid, but pinning a release tag would make the guide more reproducible over time.
