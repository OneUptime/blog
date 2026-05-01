# Validation Summary: How to Deploy Planka (Trello Alternative) via Portainer - Trello Alternative

## Status
validated

## Post Type
Guide

## Technologies Covered
- PLANKA
- Portainer
- Docker Compose / Portainer stacks
- PostgreSQL
- Docker CLI

## Sources Consulted
- PLANKA production Docker docs: https://docs.planka.cloud/docs/installation/docker/production-version
- PLANKA admin user docs: https://docs.planka.cloud/docs/configuration/admin-user/
- PLANKA backup and restore docs: https://docs.planka.cloud/docs/installation/docker/backup-and-restore
- Official PLANKA `docker-compose.yml`: https://raw.githubusercontent.com/plankanban/planka/refs/heads/master/docker-compose.yml
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose top-level `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose interpolation docs: https://docs.docker.com/reference/compose-file/interpolation/
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/16/app-pg-isready.html
- PostgreSQL `pg_dump` docs: https://www.postgresql.org/docs/17/app-pgdump.html

## Issues Found
- The original stack used a non-official application image name (`planka-trello-alternative`). I replaced it with the official image `ghcr.io/plankanban/planka:latest`.
- The original stack omitted required PLANKA settings such as `BASE_URL` and `SECRET_KEY`, and it described a web-based first-user setup that PLANKA does not create automatically. I added the required environment variables plus `DEFAULT_ADMIN_*` values and updated the setup steps to match PLANKA's documented admin-user creation flow.
- The original port mapping published `80:80`, but the official PLANKA container listens on port `1337`. I corrected the mapping to `3000:1337` and aligned the access instructions with that port.
- The original database settings and health check used generic `app/appdb` values and `pg_isready -U app`. I aligned the database name, user, connection string, and health check with a working PLANKA/PostgreSQL configuration.
- The original Compose snippet included a top-level `version: "3.8"` entry. I removed it because Docker documents the top-level `version` field as obsolete.
- The original backup commands used hard-coded names (`postgres_container`, `app-data`) that would not match a Portainer stack reliably. I changed them to explicit placeholders for the actual container and volume names and aligned the commands with the corrected database and volume layout.

## Review Notes
- The example now matches the current official PLANKA Docker deployment pattern as of May 1, 2026.
- This Portainer stack example assumes a Compose-compatible Portainer stack deployment. In Portainer environments backed by Docker Swarm, some Compose behaviors can differ.
