# Validation Summary: How to Set Up Docker Container Auto-Healing Without Orchestration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker health checks
- Dockerfile HEALTHCHECK
- Docker restart policies
- Docker Compose
- systemd
- Bash watchdog scripting
- willfarrell/autoheal
- Node.js health endpoint examples
- PostgreSQL and Redis health check commands

## Sources Consulted
- Docker Docs: docker container run health check and restart policy options - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Dockerfile HEALTHCHECK reference - https://docs.docker.com/reference/builder/#healthcheck
- Docker Docs: Compose healthcheck service attribute - https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Docs: Compose top-level version element is obsolete - https://docs.docker.com/reference/compose-file/version-and-name/#version-top-level-element-obsolete
- Docker Docs: docker compose up - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: docker compose logs - https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Hub: willfarrell/autoheal image documentation - https://hub.docker.com/r/willfarrell/autoheal
- npm Docs: npm config `only` and `production` deprecation in favor of `--omit=dev` - https://docs.npmjs.com/cli/v10/using-npm/config/
- Local Docker CLI help from Docker 29.4.2 for `docker run`, `docker restart`, `docker logs`, and `docker compose logs`.

## Issues Found
- The Nginx and failing Alpine examples used `curl` inside Alpine-based images. `curl` is not guaranteed to be present in those images, so the failing example could fail because the command is missing rather than because nothing listens on port 8080. Changed those health checks to use `wget`, which is available through BusyBox in Alpine-based images.
- The Dockerfile example used `npm ci --only=production`. npm documents `only=production` as deprecated in favor of omitting dev dependencies with `--omit=dev`. Changed it to `npm ci --omit=dev`.
- The watchdog script used `docker restart "$CONTAINER" --time 10`. Docker still accepts `--time` as a deprecated alias, but current CLI help documents `--timeout` / `-t`. Changed the script to `docker restart --timeout 10 "$CONTAINER"` and made the restart log conditional on the command succeeding.
- The Compose snippet included `version: "3.9"`. Docker Compose now treats the top-level `version` property as obsolete and informational. Removed it so the example follows the current Compose Specification style.
- The Compose example used `docker logs -f autoheal`, which assumes the generated container name is exactly `autoheal`. Compose addresses services by service name with `docker compose logs -f autoheal`, so the command was updated. The monitoring command was updated similarly to `docker compose logs autoheal --since 24h`.

## Review Notes
- The main claim is correct: Docker Engine health checks mark containers as `starting`, `healthy`, or `unhealthy`, and Docker restart policies restart containers after process exit rather than automatically restarting a running unhealthy standalone container.
- The examples assume the application images include the command-line tools used by their health checks, such as `curl`, `pg_isready`, or `redis-cli`. That is normal for illustrative examples, but production images should install or include the health-check binary explicitly.
