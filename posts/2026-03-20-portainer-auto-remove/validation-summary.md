# Validation Summary: How to Set Up Auto-Remove for Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Portainer HTTP API
- Docker Engine API

## Sources Consulted
- Portainer Docs: Add a new container (STS) - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer Docs: API usage examples (STS) - https://docs.portainer.io/sts/api/examples
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer Docs: Edge Jobs - https://docs.portainer.io/2.33-lts/user/edge/jobs
- Docker Docs: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker compose run` - https://docs.docker.com/reference/cli/docker/compose/run/
- Docker Docs: Engine API version history - https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- Corrected the Portainer UI instructions. Current Portainer docs place **Auto remove** in the **Actions** section of the Add container form, not in a generic **Runtime & Resources** or **Advanced** section.
- Corrected the explanation of `--rm` with restart policies. Docker documents `--rm` and `--restart` as conflicting options that produce an error; `--rm` is not silently ignored.
- Corrected the Compose migration example comments. A Compose service with `restart: "no"` runs once, but Compose service definitions do not auto-remove the exited container.
- Updated the Portainer API example URL to use the current HTTPS `9443` pattern shown in Portainer API docs instead of the legacy unsecured `9000` example.
- Corrected the Edge Jobs section. Portainer documents Edge Jobs as scheduled host scripts run through `crontab`, not scheduled containers.
- Updated the best-practices and conclusion text to remove the unsupported "container scheduling" wording and align it with the actual Edge Jobs feature.

## Review Notes
- Portainer documentation is versioned, so minor UI wording can vary between releases. The reviewed instructions align with current Portainer STS docs showing **Auto remove** in the **Actions** section.
- For CLI-driven one-off Compose tasks, Docker supports `docker compose run --rm`, but Compose service definitions used for stacks do not provide an `auto_remove` field.
