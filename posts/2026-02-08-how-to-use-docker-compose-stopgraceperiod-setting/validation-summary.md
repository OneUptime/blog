# Validation Summary: How to Use Docker Compose stop_grace_period Setting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Compose service configuration
- Container shutdown signals
- NGINX
- PostgreSQL
- MySQL
- Redis
- Node.js
- Python

## Sources Consulted
- Docker Compose file reference, services: https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference, version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI reference, docker container stop: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference, docker compose stop: https://docs.docker.com/reference/cli/docker/compose/stop/
- Local Docker CLI help for `docker compose down`, `docker compose stop`, `docker stop`, `docker events`, and `docker inspect`
- NGINX documentation, Control NGINX Processes at Runtime: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found
- The Compose examples used the top-level `version: "3.8"` field. Current Docker Compose treats the `version` property as obsolete and only informative, and emits a warning when it is used. Removed the `version` lines from the two full Compose snippets while leaving the service configuration unchanged.

## Review Notes
- The core explanation of `stop_grace_period`, `stop_signal`, SIGTERM followed by SIGKILL, and the default 10-second Compose grace period matches Docker's current documentation.
- The `docker compose down -t 5`, `docker compose stop -t`, `docker stop -t`, `docker events --filter`, and `docker inspect --format` command usage is valid.
- The NGINX recommendation to use `SIGQUIT` for graceful shutdown is consistent with NGINX documentation.
