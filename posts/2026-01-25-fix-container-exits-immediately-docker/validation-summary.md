# Validation Summary: How to Fix 'Container Exits Immediately' Issues in Docker

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Dockerfile CMD, ENTRYPOINT, SHELL, and HEALTHCHECK instructions
- Docker Compose
- Python and Flask
- Linux shell commands
- Nginx, Apache, MySQL, and Redis container startup patterns

## Sources Consulted
- Docker CLI reference: docker container run, including detached mode, entrypoint override, restart policies, and memory flags: https://docs.docker.com/reference/cli/docker/container/run/
- Dockerfile reference: shell form vs exec form, CMD, ENTRYPOINT, SHELL, and HEALTHCHECK behavior: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: services and healthcheck attributes: https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference: obsolete top-level version property: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification: resources.limits.memory syntax: https://docs.docker.com/reference/compose-file/deploy/
- Docker Engine container run guide: command overrides and foreground/background behavior: https://docs.docker.com/engine/containers/run/
- Local Docker CLI help for docker run, docker inspect, docker logs, docker cp, and docker compose config.

## Issues Found
- The Docker Compose environment variable snippet used `version: '3.8'`. The top-level `version` property is obsolete in current Compose, so it was removed.
- The shell-form explanation said a missing `/bin/sh` fails silently. Dockerfile shell form uses a command shell (`/bin/sh -c` on Linux by default), so a missing shell is a startup failure rather than a silent success. The wording was corrected.
- The health check section said containers can be killed if health checks fail repeatedly. Docker Engine health checks mark containers `unhealthy`; they do not normally kill standalone containers. The section was corrected to describe health status accurately.
- The OOM section described `docker run --memory-swap -1 myimage` as removing the memory limit. `--memory-swap` controls swap behavior and is meaningful with a memory limit, so the example was changed to omit `-m` for removing a memory limit and to use `-m 1g --memory-swap -1` for unlimited swap with a memory limit.
- Interactive debugging examples used `/bin/bash`, which is not present in many minimal images. They were changed to `/bin/sh`, matching Docker's official examples and improving portability.
- Entrypoint override examples were adjusted to pass a shell command after the image name, avoiding accidental reuse of the image's original CMD with the replacement entrypoint.

## Review Notes
The guide is technically sound after the fixes. Some debugging commands assume the image contains common tools such as `sh`, `curl`, or `jq` on the host; that is reasonable for a troubleshooting guide, but future revisions could mention alternatives for distroless images and hosts without `jq`.
