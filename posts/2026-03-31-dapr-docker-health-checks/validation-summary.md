# Validation Summary: How to Configure Docker Health Checks for Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar health API)
- Docker (HEALTHCHECK directive, docker inspect)
- Docker Compose (healthcheck, depends_on with conditions)
- Node.js / Express (health endpoint implementation)
- npm (dependency installation)

## Sources Consulted
- Dapr Health API documentation — https://docs.dapr.io/reference/api/health_api/
- Dapr sidecar default ports documentation — confirms default HTTP API port is 3500
- Docker Hub `daprio/daprd` tags — confirms 1.13.0 exists (pushed March 2024)
- Dockerfile reference (HEALTHCHECK) — https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Compose services reference (healthcheck) — https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Compose services reference (depends_on) — https://docs.docker.com/reference/compose-file/services/#depends_on
- npm CLI documentation for `npm ci` — https://docs.npmjs.com/cli/v10/commands/npm-ci
- Alpine Linux package contents (BusyBox wget availability in node:20-alpine)

## Issues Found

1. **Incorrect Dapr sidecar port in Docker Compose healthcheck**: The `order-service-dapr` healthcheck used port `3501` (`http://localhost:3501/v1.0/healthz`), but the default Dapr HTTP API port is `3500`. The curl script later in the post correctly used `3500`. Fixed to `http://localhost:3500/v1.0/healthz`.

2. **Deprecated npm flag**: The Dockerfile used `npm ci --only=production`, which is deprecated in npm 7+ (node:20-alpine ships with npm 10). Fixed to `npm ci --omit=dev`, which is the current equivalent.

## Review Notes
- `daprio/daprd:1.13.0` is a valid image but is outdated. The latest stable Dapr runtime is v1.17.x. The image tag works correctly for the tutorial but readers should be aware newer versions are available.
- The `version: "3.9"` field in Docker Compose is effectively ignored by modern Docker Compose v2 (the `docker compose` plugin). It does not cause errors but is no longer necessary.
- The `daprio/daprd` image in newer versions may use distroless base images that do not include `wget`. The `1.13.0` tag used in the post may still be Alpine-based, but readers using newer Dapr versions should verify `wget` availability or consider alternative healthcheck approaches.
- Dapr's `/v1.0/healthz` endpoint returns HTTP 204 (not 200) when healthy and 500 when unhealthy. The post does not explicitly state the response code from the Dapr endpoint so this is not an error, but worth noting for readers who check response bodies.
