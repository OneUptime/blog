# Validation Summary: How to Build Docker Images for Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, CLI)
- Docker (Dockerfile, docker build, docker run, HEALTHCHECK, .dockerignore)
- Node.js 20 with npm
- Python 3.12 with FastAPI and Uvicorn
- Azure Container Registry (ACR)

## Sources Consulted
- npm CLI documentation for `npm ci` flags: https://docs.npmjs.com/cli/v10/commands/npm-ci
- npm v7 changelog (deprecation of `--only=production`): https://github.com/npm/cli/releases/tag/v7.0.0
- Dapr CLI reference for `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Docker documentation for `--network host`: https://docs.docker.com/engine/network/drivers/host/
- Docker documentation for HEALTHCHECK directive: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker documentation for .dockerignore: https://docs.docker.com/build/concepts/context/#dockerignore-files

## Issues Found

### 1. Deprecated npm flag `--only=production`
- **What was wrong:** The Node.js Dockerfile used `npm ci --only=production`. The `--only` flag was deprecated in npm 7 and is no longer recognized in npm 10 (which ships with Node 20).
- **What was changed:** Replaced `--only=production` with `--omit=dev`, which is the current equivalent flag.
- **Why:** Node 20 Alpine ships with npm 10.x. Using the deprecated flag may produce warnings or be silently ignored, resulting in devDependencies being installed in the production image.

### 2. Missing `--network host` in `dapr run -- docker run` example
- **What was wrong:** The example ran `docker run -p 3000:3000` inside a `dapr run` command. The Dapr sidecar runs on the host, but the containerized app (without host networking) cannot reach the sidecar at `localhost:3500` because `localhost` inside the container refers to the container's own network namespace, not the host.
- **What was changed:** Replaced `-p 3000:3000` with `--network host` and added `--rm` for cleanup. With host networking, the container shares the host's network stack, so the app can communicate with the Dapr sidecar at `localhost:3500`.
- **Why:** Without `--network host`, the Dapr sidecar can reach the app (via port mapping), but the app cannot call Dapr APIs — breaking the bidirectional communication that Dapr requires.

## Review Notes
- The `HEALTHCHECK` directive uses `wget -qO-`, which works on Alpine-based images (busybox provides wget). If the reader uses a Debian/slim-based image instead, `curl` would be the appropriate alternative.
- The `dapr run -- docker run` pattern is functional with `--network host` on Linux but has limitations on macOS/Windows where Docker Desktop's host networking behaves differently. The post already recommends Docker Compose as a cleaner alternative, which is good guidance.
- The Python Dockerfile and all Docker build/tag/push commands are correct.
