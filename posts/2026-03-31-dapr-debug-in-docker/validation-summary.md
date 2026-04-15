# Validation Summary: How to Debug Dapr Applications in Docker Containers

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar runtime, HTTP API, daprd CLI)
- Docker (logs, exec, inspect, stats, top)
- Docker Compose (multi-service log viewing, port mapping)

## Sources Consulted
- Dapr CLI reference and arguments overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr self-hosted with Docker guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr HTTP API reference: https://docs.dapr.io/reference/api/
- Dapr health API: https://docs.dapr.io/reference/api/health_api/
- Dapr metadata API: https://docs.dapr.io/reference/api/metadata_api/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr state management API: https://docs.dapr.io/reference/api/state_api/
- Dapr pub/sub API: https://docs.dapr.io/reference/api/pubsub_api/
- Docker Hub daprio/daprd image: https://hub.docker.com/r/daprio/daprd

## Issues Found
1. **`--components-path` flag is deprecated**: The post used `--components-path` in the `daprd` command within the Docker Compose snippet. This flag is deprecated in favor of `--resources-path` in Dapr 1.11+. Since the post references `daprio/daprd:1.13.0`, the deprecated flag would still work but would emit a deprecation warning. Changed to `--resources-path` to align with current best practices.

## Review Notes
- All Dapr HTTP API endpoints (`/v1.0/healthz`, `/v1.0/metadata`, `/v1.0/invoke/...`, `/v1.0/state/...`, `/v1.0/publish/...`) are correct and match the official API reference.
- The Docker image name `daprio/daprd` is correct (not `dapr/daprd`).
- The default sidecar HTTP port 3500 is correct.
- All `daprd` flags (`--app-id`, `--app-port`, `--app-channel-address`, `--log-level`) are correctly named and used with appropriate values.
- The Docker commands (`docker compose logs`, `docker exec`, `docker inspect`, `docker stats`, `docker top`) are all syntactically correct with valid flags.
- The `docker inspect` Go template syntax (`{{json .Config.Env}}`, `{{json .Config.Cmd}}`) is correct.
- The use of `wget -qO-` inside the sidecar container is a reasonable choice since the `daprio/daprd` image is minimal and may not have `curl` installed.
- The simulated debug log output format is representative of actual Dapr structured logging output.
