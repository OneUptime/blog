# Validation Summary: How to Use Docker Secrets in Swarm and Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm
- Docker Secrets
- Docker Compose
- Compose Specification
- PostgreSQL, MySQL, MariaDB, and MongoDB Docker Official Images
- Shell scripting
- Node.js
- Python
- Go

## Sources Consulted
- Docker Docs: Manage sensitive data with Docker secrets: https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Manage secrets securely in Docker Compose: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs: Compose file `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Compose Specification: Secrets top-level element: https://github.com/compose-spec/compose-spec/blob/main/09-secrets.md
- Docker Hub: PostgreSQL Official Image: https://hub.docker.com/_/postgres
- Docker Hub: MySQL Official Image: https://hub.docker.com/_/mysql
- Docker Hub: MariaDB Official Image: https://hub.docker.com/_/mariadb
- Docker Hub: Mongo Official Image: https://hub.docker.com/_/mongo
- Local Docker CLI help for `docker secret create`, `docker service create`, `docker service update`, `docker stack deploy`, and `docker compose up`.

## Issues Found
- The introductory and overview text implied all Docker secrets are encrypted at rest and stored in tmpfs. This is accurate for Swarm secrets on Linux, but local Compose file-backed secrets are bind-mounted files. Updated the wording to scope encryption and tmpfs claims to Swarm mode.
- Compose YAML examples used the obsolete top-level `version: '3.8'` field. Removed it from the snippets because current Docker Compose ignores it and warns that it is obsolete.
- The environment-backed Compose secrets section said Compose v2.23+ was required. Updated this to Compose v2.6.0+ based on the current Compose Specification.
- The Compose command used legacy `docker-compose up`. Updated it to the current Compose v2 command, `docker compose up`.
- The `_FILE` entrypoint helper used an unquoted command substitution in an exported assignment. Updated it so secret values containing spaces are preserved.
- The Swarm rotation example added `db_password_v2` without preserving the original mount target, which would change the file path to `/run/secrets/db_password_v2`. Updated it to `--secret-add source=db_password_v2,target=db_password`.

## Review Notes
The post is technically valid after the changes. The edited YAML snippets were checked with `docker compose config` and `docker stack config`, and the edited shell entrypoint snippet passed `sh -n` plus a basic runtime test with a secret value containing spaces.
