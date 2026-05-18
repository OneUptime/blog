# Validation Summary: How to Set Up Drone CI Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Drone CI (server v2.x and drone-runner-docker v1.x)
- Docker / Docker Compose
- Ubuntu 20.04+
- Gitea OAuth2
- GitHub OAuth Apps
- Nginx (reverse proxy with WebSocket support)
- Certbot / Let's Encrypt
- Drone CLI (from `harness/drone-cli`)
- `.drone.yml` pipeline syntax (kind: pipeline, type: docker)

## Sources Consulted
- Drone CI server docs — https://docs.drone.io/server/overview/
- Drone Docker runner configuration reference — https://docs.drone.io/runner/docker/configuration/reference/
- `DRONE_MEMORY_LIMIT` reference — https://docs.drone.io/runner/docker/configuration/reference/drone-memory-limit/
- drone-runner-docker source — https://github.com/drone-runners/drone-runner-docker/blob/master/command/daemon/config.go
- Drone CLI repository — https://github.com/harness/drone-cli
- `drone jsonnet` docs — https://docs.drone.io/cli/drone-jsonnet/
- `drone lint` docs — https://docs.drone.io/cli/drone-lint/
- Drone Gitea provider docs — https://docs.drone.io/server/provider/gitea/
- Drone GitHub provider docs — https://docs.drone.io/server/provider/github/
- drone/drone Docker Hub tags — https://hub.docker.com/r/drone/drone/tags
- Drone pipeline (Docker) YAML reference — https://docs.drone.io/pipeline/docker/syntax/

## Issues Found

1. **Invalid env var `DRONE_CPU_LIMIT`** in the drone-runner-docker `environment:` block. The Docker runner does not support `DRONE_CPU_LIMIT`; its CPU-related variables are `DRONE_CPU_PERIOD`, `DRONE_CPU_QUOTA`, `DRONE_CPU_SET`, and `DRONE_CPU_SHARES`. Replaced with `DRONE_CPU_QUOTA=200000` (the canonical way to express ~2 cores against the default 100,000-microsecond CFS period) and updated the inline comment to match. `DRONE_MEMORY_LIMIT` is correct and was left as-is.

2. **`drone jsonnet` mislabeled as a YAML validator** in the troubleshooting section. `drone jsonnet` transforms `.drone.jsonnet` templates into YAML — it does not validate pipeline syntax. Replaced with `drone lint`, which is the correct CLI subcommand for validating `.drone.yml` files.

## Review Notes
- `drone/drone:2` floating tag is valid and currently resolves to the 2.x line (2.28.x at the time of review). Pinning to a specific minor (e.g. `drone/drone:2.28`) would be more reproducible, but the floating tag matches common practice in Drone's own docs.
- The Docker Compose file uses `version: '3.8'`. Modern Docker Compose (v2) ignores the `version` key but still accepts it — no breakage.
- The post mixes `docker-compose` (hyphenated, v1 plugin) and the standard wording; with the `docker-compose` apt package installed as shown, the hyphenated form continues to work. On newer Docker installs users may need `docker compose` (space) instead — not strictly wrong, but worth noting.
- The Nginx config correctly includes `Upgrade`/`Connection: upgrade` headers and bumped `proxy_read_timeout` — required for Drone's live log streaming, which is good practice.
- The GitHub OAuth example only sets `DRONE_GITHUB_CLIENT_ID` / `DRONE_GITHUB_CLIENT_SECRET`. This is correct for github.com; users on GitHub Enterprise would additionally need `DRONE_GITHUB_SERVER`. Not an error, just a scope choice.
