# Validation Summary: How to Deploy Stacks with Health Checks for All Services in Portainer - Stack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose / Compose Specification
- Docker Compose health checks and `depends_on`
- Docker Compose profiles and environment variables
- Docker Compose networks and volumes
- Docker Swarm stack deployment caveats

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order guide: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose profiles guide: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose predefined environment variables: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Compose extensions and YAML anchors: https://docs.docker.com/reference/compose-file/extension/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker CLI `docker compose config` reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Engine restart policy documentation: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker CLI `docker stack deploy` reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Swarm stack deployment guide: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer inspect/edit stack documentation: https://docs.portainer.io/user/docker/stacks/edit
- Portainer container statistics documentation: https://docs.portainer.io/user/docker/containers/stats

## Issues Found
- The description and introduction claimed health checks enable automatic recovery. Docker's health check documentation describes health status reporting, and Docker restart policy documentation applies restarts to container exits; from those sources, automatic recovery from an unhealthy status alone is not guaranteed. Changed the wording to readiness checks and monitoring.
- The prerequisites implied the same Compose file was equally suitable for Docker Swarm. Docker's Swarm stack guide notes that `docker stack deploy` uses legacy Compose file support and is not fully compatible with the current Compose Specification. Changed the prerequisite to Docker Standalone and added a Swarm caveat.
- The main Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Compose treats `version` as informative and warns that it is obsolete.
- The `x-common-healthcheck` YAML anchor included a nested `healthcheck:` key, so merging it under a service's `healthcheck` produced `healthcheck.healthcheck.*` instead of valid healthcheck fields. Changed the anchor to contain only `interval`, `timeout`, `retries`, and `start_period`.
- The API service `DB_URL` did not match the configured Postgres username and password. Updated it to use `appuser` and `${DB_PASSWORD}`.
- The environment variable list marked `REDIS_PASSWORD`, `APP_SECRET`, and `DOMAIN` as required even though the examples did not use them. Removed the unused required variables.
- The profiles instruction did not mention the Docker Standalone scope. Clarified that `COMPOSE_PROFILES` applies to Docker Standalone stacks in this context.
- The update section said Portainer performs a rolling update. Portainer redeploys the stack, while Swarm rolling update behavior is controlled through `deploy.update_config`. Updated the wording accordingly.
- The conclusion described the stack as self-healing. Changed that to improved startup ordering and failure visibility.

## Review Notes
- The `depends_on.condition: service_healthy` examples match the current Docker Compose documentation for Docker Compose deployments.
- The NFS volume `driver_opts`, bridge network configuration, `internal: true`, profile syntax, and `docker compose config --quiet` command match current Docker documentation.
- Local YAML parsing passed for all YAML snippets. Full `docker compose config` validation could not be run in this workspace because the Docker CLI is not installed.
