# Validation Summary: How to Deploy Stacks with Named Volumes and NFS Mounts in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Docker Standalone
- Docker volumes
- NFS-backed Docker volumes
- PostgreSQL and Redis containers
- YAML anchors

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services and healthcheck reference: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Compose startup order and `depends_on` conditions: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose profiles: https://docs.docker.com/reference/compose-file/profiles/
- Docker Compose pre-defined environment variables: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Compose `config` CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose `exec` CLI reference: https://docs.docker.com/reference/cli/docker/compose/exec/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Engine volumes and NFS examples: https://docs.docker.com/engine/storage/volumes/
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer inspect/edit stack documentation: https://docs.portainer.io/user/docker/stacks/edit
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The main Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as obsolete.
- The reusable healthcheck YAML anchor nested the settings under a second `healthcheck` key, which would merge invalid keys into each service healthcheck. Changed the anchor to contain only valid healthcheck fields.
- The prerequisite said Docker or Docker Swarm, but the examples use Docker Compose standalone behavior such as `docker compose`, bridge networks, and profile activation. Narrowed the prerequisite to Docker Standalone.
- The API `DB_URL` omitted the configured PostgreSQL user and password. Updated it to use `appuser` and `${DB_PASSWORD}`, matching the PostgreSQL service environment.
- The environment variable snippet listed unused variables as required. Reduced it to the `DB_PASSWORD` variable actually referenced by the Compose file.
- The profile activation line claimed Portainer-specific behavior for `COMPOSE_PROFILES`. Reworded it to the documented Docker Compose behavior.
- The update section said Portainer performs a rolling update. Reworded this to say Portainer redeploys the stack with the updated configuration, which matches Portainer's stack update behavior more generally.
- The volume permissions troubleshooting command used `docker exec app`, which assumes a specific container name. Changed it to `docker compose exec service-name` so the command matches Compose service usage.
- The conclusion said health checks and dependencies create self-healing stacks. Reworded this to say they improve startup ordering and observability, which is what Docker Compose documents.

## Review Notes
Docker was not installed in the local workspace, so `docker compose config` could not be run here. The YAML code fences were parsed successfully with PyYAML, and the Compose behavior was checked against official Docker and Portainer documentation.
