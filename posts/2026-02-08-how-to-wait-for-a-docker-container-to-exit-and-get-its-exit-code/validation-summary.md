# Validation Summary: How to Wait for a Docker Container to Exit and Get Its Exit Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker containers
- Docker Compose
- Bash scripting
- Unix process exit codes
- CI/CD scripting

## Sources Consulted
- Docker Docs: docker container wait - https://docs.docker.com/reference/cli/docker/container/wait/
- Docker Docs: Running containers / docker run exit status - https://docs.docker.com/engine/containers/run/
- Docker Docs: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: docker compose up - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: Compose services / depends_on - https://docs.docker.com/reference/compose-file/services/#depends_on
- Local Docker CLI help: `docker wait --help`, Docker client 29.4.2
- Local Docker Compose help: `docker compose up --help`, Docker Compose v5.1.3

## Issues Found
- The Docker Compose example used both `--exit-code-from test` and `--abort-on-container-exit`, and the text described them as separate combined flags. Current Docker Compose documentation states that `--exit-code-from` returns the selected service's exit code and implies `--abort-on-container-exit`. I removed the redundant flag from the command and updated the explanation.

## Review Notes
The Docker CLI examples, `docker wait` usage, `docker inspect --format` examples, detached versus foreground `docker run` behavior, common signal-derived exit codes, OOMKilled inspection, and Compose `depends_on.condition: service_healthy` syntax are consistent with current Docker documentation. The timeout script uses Bash-specific `wait -n`, which is appropriate because the script declares `#!/bin/bash`.
