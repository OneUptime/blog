# Validation Summary: How to Run Jellyfin in Docker for Media Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jellyfin
- Docker
- Docker Compose
- Intel Quick Sync / VAAPI hardware transcoding
- NVIDIA NVENC hardware transcoding
- Nginx reverse proxy
- Jellyfin API
- OneUptime HTTP monitoring

## Sources Consulted
- Jellyfin container installation documentation: https://jellyfin.org/docs/general/installation/container/
- Jellyfin hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/
- Jellyfin Intel GPU hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/intel/
- Jellyfin NVIDIA GPU hardware acceleration documentation: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/nvidia/
- Jellyfin Nginx reverse proxy documentation: https://jellyfin.org/docs/general/post-install/networking/reverse-proxy/nginx/
- Jellyfin monitoring documentation: https://jellyfin.org/docs/general/post-install/networking/advanced/monitoring/
- Jellyfin API OpenAPI schema: https://api.jellyfin.org/openapi/jellyfin-openapi-stable.json
- Docker Compose CLI help output for `docker compose config`
- curl CLI help output for `curl --include`

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose specification style and Jellyfin's official Compose examples.
- The Docker Compose example used `PUID` and `PGID`, which are LinuxServer.io image conventions and are not used by the official `jellyfin/jellyfin` image. Replaced them with `user: 1000:1000`.
- The Compose example exposed UDP port `1900` as a generic service discovery port. Jellyfin's official container docs expose `8096/tcp` and `7359/udp` in bridge mode and note that host networking is required for DLNA. Removed the `1900` mapping from the bridge-mode example.
- The Intel hardware transcoding snippet hard-coded render group ID `109`. Updated the text to make the group ID host-specific and added the official `getent group render | cut -d: -f3` check.
- The NVIDIA Compose snippet only set NVIDIA environment variables. Updated it to include the GPU device reservation pattern from Jellyfin's official Docker Compose example; the official image already sets the required NVIDIA environment variables.
- The initial setup wizard described TheTVDB as a default metadata provider. Corrected this to note that The Movie Database and OMDb are built-in defaults, while TheTVDB is available from the official plugin catalog.
- The transcoding UI instructions identified VAAPI as the Intel option. Updated this to include Intel Quick Sync as the primary Intel hardware acceleration method, with VAAPI also available.
- The Nginx example used `listen 443 ssl http2;`, which is deprecated in newer Nginx releases. Updated it to `listen 443 ssl;` with `http2 on;`.
- The Nginx example did not include Jellyfin's documented `/socket` WebSocket location or `proxy_buffering off` for main traffic. Added both to align with Jellyfin's official reverse proxy guidance.

## Review Notes
The corrected primary Docker Compose example was validated with `docker compose config -q`. Nginx was not installed in the local environment, so the reverse proxy snippet was reviewed against Jellyfin's official Nginx documentation rather than checked with `nginx -t`.
