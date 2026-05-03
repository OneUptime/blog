# Validation Summary: How to Deploy Focalboard via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Focalboard (standalone, mattermost/focalboard image)
- Portainer
- Docker / Docker Compose
- PostgreSQL 15
- Focalboard REST API v2

## Sources Consulted
- Docker Hub `mattermost/focalboard` tags page (https://hub.docker.com/r/mattermost/focalboard/tags) — confirmed `7.11.4` tag exists and is the latest released version.
- Focalboard server docker config (https://github.com/mattermost/focalboard/blob/main/docker/server_config.json) — verified config.json field names (`serverRoot`, `port`, `dbtype`, `dbconfig`, `useSSL`, `webpath`, `filespath`, `telemetry`, `session_expire_time`, `session_refresh_time`, `localOnly`, `enableLocalMode`, `localModeSocketLocation`).
- Focalboard auth API (https://github.com/mattermost/focalboard/blob/main/server/api/auth.go) — confirmed login endpoint is registered at `/login` under `/api/v2`, and the body shape uses `type`, `username`, `password`.
- Focalboard boards API (https://github.com/mattermost/focalboard/blob/main/server/api/boards.go) — confirmed list-boards endpoint is `/teams/{teamID}/boards` (not `/boards`).

## Issues Found
- The "List boards" curl example used `GET /api/v2/boards`, which is not a valid Focalboard route. The boards listing endpoint requires a team ID and is registered as `GET /api/v2/teams/{teamID}/boards`. In personal-server mode the standalone Focalboard server uses team ID `"0"`. Fixed the example to call `http://localhost:8000/api/v2/teams/0/boards` and added a comment explaining the team ID convention.

## Review Notes
- The `mattermost/focalboard` standalone Docker image (including `7.11.4`) was last pushed in 2023 and the standalone project is in maintenance mode, as the post itself correctly notes. Readers should plan accordingly; the post already recommends Mattermost's integrated Boards for new projects.
- The login example uses `username: "admin"` for illustration; the very first user registered through the UI does not automatically receive an "admin" username — readers should substitute the credentials they registered in Step 3.
- The `prometheus_address` field is included in the config.json snippet. It is accepted by the server (Prometheus metrics support) but is not present in the upstream sample `docker/server_config.json`; including it here is harmless and exposes metrics on port 9092 inside the container only.
- The `./config.json` host bind mount in the compose file relies on the path being resolved relative to where the stack is deployed. When using Portainer's Web Editor for stacks the working directory is set by Portainer; users may need to adjust the path or use a Portainer "Configs" / file-share mount on their setup.
