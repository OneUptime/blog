# Validation Summary: How to Set Up Docker Compose Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Compose profiles
- Compose files and override files
- PostgreSQL, Redis, NGINX, Prometheus, Grafana, Loki, Jaeger, Selenium, MockServer, pgAdmin, Swagger UI, MailHog

## Sources Consulted
- Docker Docs: Using profiles with Compose: https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs: Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose profiles reference: https://docs.docker.com/reference/compose-file/profiles/
- Docker Docs: Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: Postgres Official Image documentation: https://hub.docker.com/_/postgres
- Local Docker Compose CLI help for `docker compose`, `docker compose config`, and `docker compose ps`

## Issues Found
- The Compose YAML examples used the top-level `version: '3.8'` key. Current Docker Compose treats the `version` property as obsolete and only informative, so I removed it from the examples.
- The "Listing Services by Profile" section said `docker compose config --services` lists all services including profiled services, and used `docker compose ps --services` for services that would start without profiles. Current Compose behavior is that `docker compose config --services` lists the active model for the enabled profiles, while `docker compose ps --services` lists services for existing containers. I changed the examples to use `docker compose config --services` for services active without profiles, `docker compose --profile debug config --services` for a specific profile, and `docker compose --profile "*" config --services` for all profiled services.
- Several examples used the official `postgres:15` image without setting `POSTGRES_PASSWORD`. The official Postgres image requires a non-empty `POSTGRES_PASSWORD` unless trust authentication is intentionally configured. I added minimal `POSTGRES_PASSWORD=example` values, and updated the development example's database URL plus `POSTGRES_DB=app` so the referenced database and credentials match.

## Review Notes
- Docker Compose profile behavior, `--profile`, multiple profile activation, `COMPOSE_PROFILES`, explicit CLI profile precedence over the environment variable, and profile dependency behavior were verified against Docker's official documentation.
- YAML code blocks were parsed successfully after the edits.
