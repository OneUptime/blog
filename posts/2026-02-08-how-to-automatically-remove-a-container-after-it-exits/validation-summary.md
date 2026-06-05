# Validation Summary: How to Automatically Remove a Container After It Exits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker containers
- Docker volumes
- Docker Compose
- Cron-based cleanup automation

## Sources Consulted
- Docker CLI reference: `docker container run` (`--rm`, `--detach`, `--restart`) - https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference: `docker container ls` / `docker ps` (`--all`, `--quiet`, `--filter`) - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: `docker container prune` (`--force`, `--filter`) - https://docs.docker.com/reference/cli/docker/container/prune/
- Docker CLI reference: `docker system prune` (`--volumes`, default prune behavior) - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker storage documentation: named and anonymous volumes with `--rm` - https://docs.docker.com/engine/storage/volumes/
- Docker Compose CLI reference: `docker compose run --rm` - https://docs.docker.com/reference/cli/docker/compose/run/
- Docker Compose CLI reference: `docker compose down` and `--volumes` - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Compose file services reference: `init` field behavior - https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The stopped-container count command used `docker ps -a --filter "status=exited" | wc -l`, which counts the table header as one line. Changed it to `docker ps -a -q --filter "status=exited" | wc -l` so it counts only container IDs.
- The Docker Compose section said regular services could "add an `init` field" for cleanup. The Compose `init` field runs an init process inside the container and is unrelated to removing containers, so the reference was removed.
- The Compose `down -v` comment described a "complete cleanup." Docker Compose `down -v` removes named volumes declared in the Compose file and anonymous volumes attached to containers, so the wording was narrowed to "Compose-managed volumes."
- The `docker system prune -f` comment said it removes all unused Docker resources. By default, Docker removes stopped containers, unused networks, dangling images, and build cache, while volumes require `--volumes` and all unused images require `--all`. The comment was corrected.
- The `docker system prune -f --volumes` comment said it includes unused volumes. Current Docker CLI help describes `--volumes` as pruning anonymous volumes, so the comment was narrowed to anonymous volumes.

## Review Notes
The remaining commands and explanations match current Docker CLI and Docker Compose behavior. The post correctly notes that `docker run --rm` removes the container and associated anonymous volumes, that named volumes survive container removal, that `--rm` conflicts with restart policies, and that `docker compose run --rm` is the Compose equivalent for one-off tasks.
