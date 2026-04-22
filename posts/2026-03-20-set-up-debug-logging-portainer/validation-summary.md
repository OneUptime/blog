# Validation Summary: How to Set Up Debug Logging in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine and Docker CLI
- Docker container logging drivers
- Shell commands and grep filtering

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE Docker installation guide: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer source for CLI flag definitions: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source for log-level handling: https://github.com/portainer/portainer/blob/develop/api/logs/log.go
- Docker CLI reference for `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference for `docker container stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference for `docker container rm`: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker logging driver configuration documentation: https://docs.docker.com/engine/logging/configure/

## Issues Found
- The original section "Increase Logging on a Running Container" said debug logging could be enabled "without recreating the container", but the shown commands stop, remove, and recreate the container. Docker logging/runtime configuration changes also require a recreated container when changed via `docker run`. Changed the heading and wording to describe recreating an existing container with updated flags.
- The comment above `docker inspect portainer --format '{{.Args}}'` said it retrieved the current run command flags. That format prints the container's command arguments, not the full original `docker run` flags such as ports, volumes, restart policy, or logging options. Updated the comment to say it checks the current Portainer command arguments.

## Review Notes
- Portainer's current installation documentation uses the `portainer/portainer-ce:sts` tag in examples. The post's `latest` tag is still a conventional Docker image reference, but a fixed version, `sts`, or `lts` tag would be more reproducible in future revisions.
- Docker was not installed in the local review environment, so Docker command behavior was validated against the official Docker CLI documentation rather than local `--help` output.
