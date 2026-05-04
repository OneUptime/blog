# Validation Summary: How to Set Up Container Dependencies (depends_on) in Portainer Stacks (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker / Docker CLI
- Docker Compose (v3.8 schema)
- jq
- Portainer REST API
- curl

## Sources Consulted
- Docker CLI reference (https://docs.docker.com/reference/cli/docker/)
- `docker inspect` reference (https://docs.docker.com/reference/cli/docker/inspect/)
- `docker ps` reference (https://docs.docker.com/reference/cli/docker/container/ls/)
- `docker stats`, `docker logs`, `docker exec`, `docker cp` references
- Docker Compose specification (https://docs.docker.com/reference/compose-file/)
- Compose `deploy` key documentation (https://docs.docker.com/reference/compose-file/deploy/)
- Compose `healthcheck` documentation (https://docs.docker.com/reference/compose-file/services/#healthcheck)
- Portainer API documentation (https://docs.portainer.io/api/access)
- Portainer authentication endpoint `/api/auth` (https://docs.portainer.io/api/examples)

## Issues Found
No technical issues found. All Docker CLI invocations (`docker ps -a`, `docker stats`, `docker logs --tail`, `docker inspect`, `docker exec -it`, `docker cp`, `docker run --user`), `jq` filter expressions, the Compose YAML structure, and the Portainer API paths (`POST /api/auth`, `GET /api/endpoints/{id}/docker/containers/json` with `Authorization: Bearer <jwt>`) match current official documentation.

## Review Notes
- **Title vs. content mismatch**: The post is titled "How to Set Up Container Dependencies (depends_on) in Portainer Stacks" but the body never demonstrates the Compose `depends_on` directive (neither the short list form nor the long form with `condition: service_healthy` / `service_started` / `service_completed_successfully`). The content is a generic Portainer container-management overview. I did not address this because the review instructions forbid adding new sections or content beyond fixing technical errors — this is a content-scope issue, not a technical inaccuracy. A future editorial pass should either add a real `depends_on` example or rename the post.
- **Compose `version: "3.8"`**: Still parsed by Docker Compose, but the top-level `version` field is considered obsolete under the current Compose Specification and emits a warning in Compose v2. Not incorrect, but worth removing in a future cleanup.
- **`deploy.resources.limits`**: These are only enforced by `docker stack deploy` (Swarm) or with `docker compose --compatibility up`. Since the post is about Portainer Stacks (which support Swarm deployments), this is acceptable, but a non-Swarm reader using plain `docker compose up` would find the limits silently ignored. A clarifying note would help future readers.
- The healthcheck assumes `curl` is present in the application image, which is often not the case for minimal/distroless images — a common gotcha worth flagging in a future revision.
