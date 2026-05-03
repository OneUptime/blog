# Validation Summary: How to Deploy Jellyfin via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Jellyfin (open-source media server)
- Portainer (container management UI)
- Docker / Docker Compose
- VAAPI (Intel GPU hardware transcoding)
- NVIDIA Container Runtime (referenced)

## Sources Consulted
- Official Jellyfin Docker image docs (`jellyfin/jellyfin` on Docker Hub) — https://hub.docker.com/r/jellyfin/jellyfin
- Jellyfin official installation docs — https://jellyfin.org/docs/general/installation/container
- Jellyfin source: `Jellyfin.Server/Startup.cs` (`MapHealthChecks("/health")`) — https://github.com/jellyfin/jellyfin
- Jellyfin hardware acceleration docs (VAAPI / `/dev/dri/renderD128`) — https://jellyfin.org/docs/general/administration/hardware-acceleration/
- ASP.NET Core Health Checks middleware default response format — https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks
- Portainer Stacks documentation — https://docs.portainer.io/user/docker/stacks

## Issues Found
1. **Incorrect `/health` endpoint response format.** The post claimed Jellyfin returns `{"Status":"Healthy"}` (JSON). Jellyfin uses ASP.NET Core's default `MapHealthChecks("/health")` middleware with no custom response writer, which emits plain text (`Healthy` / `Unhealthy` / `Degraded`) with the corresponding HTTP status code. Updated the Monitoring section to state Jellyfin returns plain text `Healthy` with HTTP 200.

## Review Notes
- The compose file is valid. `version: "3.8"` is harmless (current Compose ignores it but tolerates it).
- Ports 8096 (HTTP) and 8920 (HTTPS) match Jellyfin defaults. The post correctly omits the optional DLNA (1900/udp) and auto-discovery (7359/udp) ports.
- `JELLYFIN_PublishedServerUrl` is a valid environment variable for setting the externally-published URL.
- VAAPI device path `/dev/dri/renderD128` and the Dashboard > Playback configuration steps are correct.
- The NVIDIA section is intentionally brief; in practice users need `nvidia-container-toolkit` installed and either `runtime: nvidia` or the `deploy.resources.reservations.devices` block. This is acceptable for a high-level pointer but could be expanded in a future revision.
- The `:ro` (read-only) bind mounts for media directories are a sensible default and won't break Jellyfin (it only writes metadata to `/config` and `/cache`).
