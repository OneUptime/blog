# Validation Summary: How to Debug Docker Container Startup Failures

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Compose
- Dockerfile instructions
- Bash shell scripts and exit codes
- Container health checks
- jq for JSON formatting

## Sources Consulted
- Docker CLI reference: docker container logs - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Engine guide: Running containers and exit statuses - https://docs.docker.com/engine/containers/run/
- Docker Engine guide: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Compose CLI reference: logs - https://docs.docker.com/reference/cli/docker/compose/logs/
- Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- GNU Bash manual: Exit Status - https://www.gnu.org/software/bash/manual/
- Local CLI help for Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- Added Docker's reserved `docker run` exit code `125` to the exit-code table. Docker documents `125`, `126`, and `127` as special statuses for `docker run`; omitting `125` left out a common startup failure mode where the container command never starts.
- Updated diagnostic `docker run` examples for checking `node_modules`, Python packages, and mounted config files to override the image entrypoint. Passing `ls` or `pip list` after the image name can become arguments to an existing `ENTRYPOINT` instead of replacing the startup command.
- Quoted the `$(pwd)/config:/app/config` bind mount example so paths containing spaces are handled correctly by the shell.
- Fixed the summary `docker inspect` commands to include the required container argument. The Docker CLI requires `docker inspect [OPTIONS] NAME|ID [NAME|ID...]`.

## Review Notes
The remaining commands and configuration snippets match current Docker CLI and Compose behavior. The Compose `deploy.resources.limits.memory` example is valid in the current Compose Specification; `mem_limit` is also available for service-level memory limits, but adding that alternative was not necessary for correctness.
