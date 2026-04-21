# Validation Summary: How to Set Up Stack Dependencies Between Services in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Docker Standalone
- Docker health checks and `depends_on`
- Docker Compose profiles
- Docker named volumes and NFS-backed volumes
- PostgreSQL
- Redis

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose `version` and `name` top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference, including `depends_on` and `healthcheck`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose profiles reference: https://docs.docker.com/reference/compose-file/profiles/
- Docker Compose predefined environment variables, including `COMPOSE_PROFILES`: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Compose `config` CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose deploy/resources reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker Engine volume/NFS volume documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer add stack documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer inspect/edit stack documentation: https://docs.portainer.io/user/docker/stacks/edit
- PostgreSQL libpq connection string documentation: https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The Compose example used `version: "3.8"`. Docker now marks the top-level `version` field as obsolete and informational, so it was removed from the Compose snippet.
- The shared `x-common-healthcheck` anchor included a nested `healthcheck:` key. When merged under each service's `healthcheck`, this would create an invalid nested `healthcheck.healthcheck` field. The anchor now contains only healthcheck fields such as `interval`, `timeout`, `retries`, and `start_period`.
- The prerequisite list included Docker Swarm even though `depends_on.condition: service_healthy` is Docker Compose startup-order behavior and is not appropriate as Swarm stack ordering guidance. The prerequisite was narrowed to Docker Standalone with a note about the Compose-specific behavior.
- The API `DB_URL` omitted the `appuser` username and `${DB_PASSWORD}` password even though the Postgres service creates that user and requires that password. The URL now uses `postgresql://appuser:${DB_PASSWORD}@postgres:5432/appdb`.
- The environment variable list marked unused variables as required. It now lists only `DB_PASSWORD`, which is the variable used by the Compose file.
- The profiles instruction was phrased as Portainer-specific. It now describes enabling the profile for the Compose deployment with `COMPOSE_PROFILES=monitoring`, matching Docker Compose documentation.
- The update section said Portainer performs a rolling update. That is not generally true for Docker Standalone Compose stacks; the wording now says Portainer redeploys the stack with the updated Compose configuration.
- The conclusion claimed the configuration creates self-healing stacks. Health checks and `depends_on` improve startup ordering and failure visibility but do not by themselves make dependent services self-healing, so the wording was corrected.

## Review Notes
The YAML snippets were parsed successfully with PyYAML after the fixes. Docker is not installed in this environment, so `docker compose config` could not be run locally; the command and `--quiet` flag were verified against Docker's official CLI documentation instead.
