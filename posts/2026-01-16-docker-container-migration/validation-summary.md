# Validation Summary: How to Migrate Docker Containers Between Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker images and registries
- Docker volumes
- Docker Compose
- Bash scripting
- SSH and SCP

## Sources Consulted
- Docker Docs: docker image save - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: docker image load - https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs: docker compose config - https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Docs: docker compose down - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: docker compose stop - https://docs.docker.com/reference/cli/docker/compose/stop/
- Docker Docs: Volumes, including back up, restore, or migrate data volumes - https://docs.docker.com/engine/storage/volumes/
- Local Docker CLI help output for docker save, docker load, docker inspect, docker volume create, and docker compose.
- OneUptime linked post: https://oneuptime.com/blog/post/2026-01-16-docker-checkpoint-restore/view

## Issues Found
- The Docker Compose examples used the legacy `docker-compose` command. Updated them to the current Compose V2 `docker compose` command.
- The Docker Compose migration example directly archived `/var/lib/docker/volumes/project_*` and restored it into `/var/lib/docker/`. Replaced this with Docker-managed backup and restore commands using temporary Alpine containers, matching Docker's documented volume migration approach.
- The Docker Compose migration example used `docker-compose down`, which removes containers and networks. Changed it to `docker compose stop` so the example stops services before backing up data without removing Compose-managed resources.
- The complete migration script used a single-quoted heredoc while referencing `$COMPOSE_DIR` inside the remote script, so the remote command would not receive the intended path. Updated the SSH invocation to pass `COMPOSE_DIR` into the remote shell.
- The complete migration script copied and restored `/tmp/*.tar.gz`, which would include `images.tar.gz` and incorrectly treat the image archive as a volume archive. Changed volume backups to use a `vol_*.tar.gz` prefix and updated copy/restore globs accordingly.
- The complete migration script restored volume data into the wrong volume name after computing the target Compose volume name. Updated `docker volume create` and restore mounts to use the same computed volume name.

## Review Notes
The examples assume default Compose project naming based on the project directory. Projects that set `name:` or `COMPOSE_PROJECT_NAME`, use external volumes, or include bind mounts need corresponding adjustments. The single-container full migration example only backs up Docker named/anonymous volumes exposed in `.Mounts[].Name`; bind mounts require separate host filesystem backup.
