# Validation Summary: How to Create Docker Aliases and Functions for Faster Workflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker Compose CLI
- Bash shell aliases
- Bash shell functions
- Docker containers, images, logs, networks, volumes, and build cache

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker `ps` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker `exec` reference: https://docs.docker.com/engine/reference/commandline/exec/
- Docker `logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `inspect` reference: https://docs.docker.com/reference/cli/docker/container/inspect/
- Docker `stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker `run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `image prune` reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker `system prune` reference: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker resource pruning guide: https://docs.docker.com/engine/manage-resources/pruning/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose `up` reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose `down` reference: https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Compose `exec` reference: https://docs.docker.com/engine/reference/commandline/compose_exec/
- Docker Compose `logs` reference: https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker formatting reference: https://docs.docker.com/go/formatting/
- GNU Bash Reference Manual: https://www.gnu.org/software/bash/manual/bash.html
- Local Docker CLI help output from Docker 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The `dclean` function described `docker image prune -f` as removing unused images. Docker documents `docker image prune` without `-a` as removing dangling images only, so the comment and status message were changed to say "dangling images."
- The `dcleanall` function described `docker system prune -a -f --volumes` as removing all Docker data including volumes. Docker documents `system prune` as removing unused data, and the local CLI help describes `--volumes` as pruning anonymous volumes. The prompt, comment, and success message were changed to describe unused Docker data including anonymous volumes.
- The `dstoprem` function printed "Stopped and removed" even if `docker stop` or `docker rm` failed. The echo is now chained with `&&` so it only prints after both commands succeed.
- The `dcreset` function ran `docker compose up -d --build` even if `docker compose down -v --remove-orphans` failed. It now uses `&&`, matching the complete aliases file and preventing a reset from continuing after a failed teardown.

## Review Notes
The Docker command flags, Compose subcommands, Go-template format strings, and Bash alias/function syntax are otherwise consistent with current Docker and Bash documentation. Some functions assume common tooling inside containers, such as `bash`, `sh`, `ping`, `nslookup`, `psql`, `mysql`, or `redis-cli`; those commands depend on the selected container image and are not guaranteed to exist in every container.
