# Validation Summary: How to Manage Docker Secrets via Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker secrets
- Docker Compose/stack files for Swarm
- PostgreSQL
- Python
- Bash

## Sources Consulted
- Portainer documentation, "Add a new secret": https://docs.portainer.io/user/docker/secrets/add
- Docker documentation, "Manage sensitive data with Docker secrets": https://docs.docker.com/engine/swarm/secrets/
- Docker CLI reference, `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Compose services reference, `secrets`: https://docs.docker.com/reference/compose-file/services/
- Docker documentation, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Official Image docs for Postgres: https://hub.docker.com/_/postgres?tab=tags
- PostgreSQL documentation, "The Password File": https://www.postgresql.org/docs/current/libpq-pgpass.html

## Issues Found
- The Portainer UI navigation path was outdated. The post said `Swarm > Secrets > Add Secret`, but current Portainer documentation uses `Secrets > Add secret`. The README was updated to match the current UI.
- The plain-string secret creation examples used `echo`, which appends a trailing newline and changes the stored secret value. Those commands were changed to `printf '%s' ... | docker secret create ... -` so the created secret matches the intended value exactly.
- The Swarm stack example referenced `ssl_private_key`, but the CLI examples only showed creating `ssl_certificate`. A matching `docker secret create ssl_private_key /path/to/private.key` command was added so the examples are internally consistent.
- The shell example read the secret and then re-exposed it via an exported environment variable and a password-bearing command-line argument. That was replaced with a temporary `PGPASSFILE` example so the password is read from the Docker secret and not placed in process arguments.

## Review Notes
- `docker stack deploy` still uses the legacy Compose v3 file format for Swarm deployments, so the post's `version: '3.8'` example remains appropriate in this context.
- The `*_FILE` environment variable pattern is image-specific. `POSTGRES_PASSWORD_FILE` is supported by the official Postgres image, but custom application variables like `DB_PASSWORD_FILE` only work if the application is written to read them.
