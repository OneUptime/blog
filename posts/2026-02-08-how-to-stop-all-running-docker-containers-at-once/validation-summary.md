# Validation Summary: How to Stop All Running Docker Containers at Once

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker containers
- Docker Compose
- Dockerfile `STOPSIGNAL`
- Compose service `stop_grace_period`
- Shell scripting and `xargs`

## Sources Consulted
- Docker CLI reference: `docker container stop` - https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference: `docker container kill` - https://docs.docker.com/reference/cli/docker/container/kill/
- Docker CLI reference: `docker container rm` - https://docs.docker.com/reference/cli/docker/container/rm/
- Docker CLI reference: `docker container ls` filtering - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: `docker compose stop` - https://docs.docker.com/reference/cli/docker/compose/stop/
- Docker CLI reference: `docker compose down` - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Compose startup and shutdown order - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Dockerfile reference: `STOPSIGNAL` - https://docs.docker.com/reference/dockerfile/
- Local CLI help: `docker stop --help`, `docker compose stop --help`

## Issues Found
- The post stated that `docker stop` always sends SIGTERM and waits 10 seconds. Updated it to explain the configurable stop signal and timeout, including Docker's documented defaults of 10 seconds for Linux containers and 30 seconds for Windows containers when no container default is configured.
- The `docker stop -t 0` comment said it sends SIGKILL right away. Updated the wording to clarify that `-t 0` uses no grace period after sending the stop signal.
- The `docker compose down` comment said anonymous volumes are removed by default. Updated it to say `docker compose down` removes services and networks, and added `docker compose down -v` for removing anonymous volumes.
- The `since` filter example claimed to stop containers created in the last hour, but Docker's `since` filter is relative to a container ID or name. Updated the example to describe and show container-relative filtering.
- The final best-practices snippet mixed Dockerfile and Compose YAML in a single `dockerfile` code block. Split it into separate `dockerfile` and `yaml` blocks so each configuration example is correctly represented.

## Review Notes
The main one-liners are technically correct but many command-substitution examples still error when the filtered result is empty; the post already covers the safer `xargs -r` pattern separately. On macOS, the documented shell-variable fallback remains appropriate because BSD `xargs` does not support GNU `xargs -r`.
