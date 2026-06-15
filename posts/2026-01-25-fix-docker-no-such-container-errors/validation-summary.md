# Validation Summary: How to Fix Docker 'No Such Container' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker CLI
- Docker containers
- Docker Compose
- Bash scripting
- Mermaid diagrams

## Sources Consulted
- Docker CLI reference: docker container ls / docker ps - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: docker container exec - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference: docker container start - https://docs.docker.com/reference/cli/docker/container/start/
- Docker CLI reference: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference: docker system events / docker events - https://docs.docker.com/reference/cli/docker/system/events/
- Docker Compose CLI reference: docker compose ps - https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose CLI reference: docker compose exec - https://docs.docker.com/reference/cli/docker/compose/exec/
- Docker Compose project name documentation - https://docs.docker.com/compose/how-tos/project-name/
- Local Docker CLI help output from Docker 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The introduction and conclusion listed stopped containers as a direct cause of "No such container" errors. Stopped containers still exist and are visible with `docker ps -a`; commands such as `docker exec` against a stopped container fail because the container is not running, not because Docker cannot find it. Removed "stopped" from the direct-cause wording while retaining the guidance to check stopped containers.
- The initial `docker exec` example said a stopped container could trigger "No such container." Updated the comment to say the error applies when the container was removed or the name/ID is wrong.
- Docker Compose container-name examples used the legacy underscore form (`project_service_1`). Current Docker Compose examples use hyphen-separated names such as `project-service-1`, so the examples were updated.
- The Compose project-name note said the default project name is always the directory name. Docker Compose has higher-precedence ways to set the project name, so the wording now says this is the default only when not otherwise set.
- The quick reference described `docker ps -qf "name=exact-name"` as an exact name lookup, but Docker's documented `name` filter matches all or part of a container name. Updated the comment and example to describe it as a name-pattern lookup.
- The stopped-container recovery example described `docker start -ai` as starting an interactive shell. Docker documents `docker start -a -i` as attaching to the container's existing process and STDIN, so the wording now says it attaches interactively to the container's main process.
- The `Dead` container status note was imprecise. Docker describes dead containers as defunct containers that cannot be restarted, so the post now says to remove and recreate them.

## Review Notes
Most Docker CLI commands, filters, Go template placeholders, Compose service commands, lifecycle event names, and the `--rm` behavior were accurate. Future improvements could mention that `docker ps --filter name=...` may return multiple containers when the pattern is not unique, so scripts should handle that case when exact uniqueness matters.
