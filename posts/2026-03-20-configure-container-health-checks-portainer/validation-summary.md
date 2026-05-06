# Validation Summary: How to Configure Container Health Checks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Container health checks
- PostgreSQL
- Redis

## Sources Consulted
- Docker Compose service reference (`healthcheck`, `restart`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order and `depends_on` conditions: https://docs.docker.com/compose/how-tos/startup-order/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker restart policy documentation: https://docs.docker.com/engine/containers/start-containers-automatically/
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer container inspect documentation: https://docs.portainer.io/user/docker/containers/inspect

## Issues Found
- The post claimed that an `unhealthy` container would be automatically restarted when a Docker restart policy such as `restart: always` or `restart: unless-stopped` was set. I corrected the description, state explanation, restart-policy section, and summary because Docker restart policies apply when a container exits, not when its health status changes.
- The health state section described Docker's health states imprecisely. I corrected it so `healthy` reflects a passing check, `unhealthy` reflects hitting the configured consecutive-failure threshold, and "no health check" is treated separately from Docker's actual health statuses.
- The Portainer/`depends_on` wording was too broad. I narrowed it to Compose-based stack deployments using documented `service_healthy` behavior from Docker Compose.
- The Portainer UI section included specific color/status mappings that I could not verify in Portainer's official docs. I replaced that with the documented behavior that Portainer shows container status and exposes raw inspect data, including health information, in the **Inspect** view.
- The HTTP example comment said the probe required a `2xx` response, but the example uses `curl -f`, which is better described as requiring a successful HTTP response. I corrected the comment to match the command more closely.

## Review Notes
- Docker Compose also supports `start_interval` for health checks in newer versions. Its omission here is not incorrect, but it could be mentioned in a future revision.
- The health check examples assume the relevant utilities are present in the container image, such as `curl`, `pg_isready`, and `redis-cli`.
