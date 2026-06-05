# Validation Summary: How to Fix Docker Compose Orphan Container Warnings

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Compose CLI
- Docker Compose project names
- Docker Compose profiles
- Docker Compose environment variables

## Sources Consulted
- Docker Docs: docker compose up CLI reference - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: docker compose down CLI reference - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: docker compose ps CLI reference - https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Docs: Specify a project name - https://docs.docker.com/compose/how-tos/project-name/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Pre-defined Docker Compose environment variables - https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Docs: Using profiles with Compose - https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs: docker container ls filtering and formatting - https://docs.docker.com/reference/cli/docker/container/ls/

## Issues Found
- The post said there was no global/default way to remove orphans. Docker Compose now documents `COMPOSE_REMOVE_ORPHANS`, which automatically removes orphaned containers when enabled. I replaced that claim with a `.env` example using `COMPOSE_REMOVE_ORPHANS=true` and kept the alias examples as an alternative.
- The post listed changing the project name as a direct cause of orphan container warnings and said previous containers become orphans under the new project. Docker Compose project names isolate projects, so changing the project name leaves old containers behind under the old project instead of making them orphans in the new project. I clarified the explanation and changed the cause list to focus on accidentally reusing a project name with a different service set.
- The profiles section claimed there would be no orphan warnings simply because all services are in one file. Docker Compose profiles activate or ignore services depending on the selected profile, so the stronger claim was not guaranteed. I changed the wording to say profiles avoid switching between divergent Compose files, which is the accurate benefit.

## Review Notes
The Docker Compose commands and flags in the post are current: `docker compose up --remove-orphans`, `docker compose down --remove-orphans`, `docker compose ps -a`, `docker compose stop`, `docker compose rm -f`, `docker compose -p`, `docker compose --profile`, and the Docker `ps` label/publish filters are documented or confirmed by local CLI help. The top-level `name:` field and `COMPOSE_PROJECT_NAME` usage are also current.
