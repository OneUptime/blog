# Validation Summary: How to Deploy Emby via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Emby Media Server (emby/embyserver Docker image)
- Portainer (Stack management UI)
- Docker / Docker Compose
- Intel QuickSync / VAAPI hardware transcoding
- OneUptime (HTTP monitoring)

## Sources Consulted
- Official Emby Docker image on Docker Hub: https://hub.docker.com/r/emby/embyserver (confirmed UID/GID/GIDLIST env vars, default ports 8096/8920)
- Emby documentation on hardware transcoding and `/dev/dri` device passthrough for VAAPI/QuickSync
- Emby Server API: `/System/Info/Public` endpoint returns unauthenticated public server info (commonly used as a healthcheck)
- Emby Connect / emby.media relay for remote access

## Issues Found
No technical issues found.

- The Docker image `emby/embyserver:latest` is the official image.
- Internal container ports `8096` (HTTP) and `8920` (HTTPS) are the documented defaults; external host mapping to `8097`/`8921` is a valid offset to avoid Jellyfin port conflicts.
- The `UID`, `GID`, and `GIDLIST` environment variables are documented and supported by the official image. `GIDLIST: 44` corresponds to the `video` group on most Debian/Ubuntu hosts (group ID may vary, as the post correctly notes).
- `/dev/dri:/dev/dri` device passthrough is the correct mechanism for enabling Intel QuickSync / VAAPI hardware acceleration.
- Hardware transcoding requiring Emby Premiere is accurate.
- `/System/Info/Public` is a real, unauthenticated Emby endpoint suitable for monitoring.

## Review Notes
- `version: "3.8"` in compose files is informational only with current Docker Compose; it does not affect functionality but could be omitted in newer setups. Left as-is since the author's style uses it consistently.
- Group ID `44` for `video` is correct on Debian/Ubuntu but may differ on other distros (e.g., on some systems the `render` group, often GID `109` or `989`, is required for `/dev/dri/renderD128` access). The post already notes "group ID may vary."
- For full GPU transcoding, users on newer kernels may also need to add the `render` group to GIDLIST in addition to `video`.
