# Validation Summary: How to Deploy Matrix/Synapse via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Matrix protocol
- Synapse homeserver (matrixdotorg/synapse Docker image)
- Portainer
- Docker Compose
- PostgreSQL 16
- psycopg2 database driver
- OneUptime (for monitoring)

## Sources Consulted
- Official Synapse installation docs: https://element-hq.github.io/synapse/latest/setup/installation.html
- Synapse PostgreSQL configuration docs: https://element-hq.github.io/synapse/latest/postgres.html
- matrixdotorg/synapse Docker Hub: https://hub.docker.com/r/matrixdotorg/synapse
- Matrix Client-Server API specification: https://spec.matrix.org/v1.10/client-server-api/
- Synapse register_new_matrix_user documentation

## Issues Found
- **PostgreSQL `database` arg name**: The original `database` section used `database: synapse` as the database name argument. The official Synapse documentation and sample config use `dbname` for this field (as it is the canonical psycopg2 parameter name, with `database` being only a backward-compatible alias). Changed to `dbname: synapse` to align with the documented pattern and avoid any compatibility concerns.

## Review Notes
- The `matrixdotorg/synapse` image is officially documented as the canonical Docker Hub image; the equivalent `ghcr.io/element-hq/synapse` is also official and could be used interchangeably.
- The compose stack exposes port 8448 (federation) directly without TLS termination. Federation requires HTTPS, so a reverse proxy with valid certificates (e.g., Caddy, nginx, Traefik) is required in front of Synapse for federation to actually work — the post's prerequisites mention this requirement.
- `_matrix/client/versions` is a reasonable lightweight availability check but does not validate backend (database) connectivity. For deeper monitoring users may want to combine it with a database health check.
- `version: "3.8"` in the compose file is now considered obsolete by recent Docker Compose releases (the version field is ignored), but it is still accepted and does not break anything.
- The `docker exec -it synapse ...` command assumes the running container is named `synapse`; in a Portainer/Compose stack the actual container name is typically prefixed by the stack name (e.g. `<stack>-synapse-1`). Users may need to adjust accordingly.
