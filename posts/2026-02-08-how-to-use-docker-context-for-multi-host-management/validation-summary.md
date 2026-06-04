# Validation Summary: How to Use docker context for Multi-Host Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker contexts
- Docker Compose
- SSH
- TCP/TLS Docker daemon connections
- OpenSSH client configuration

## Sources Consulted
- Docker Docs: Docker contexts - https://docs.docker.com/engine/manage-resources/contexts/
- Docker Docs: `docker context` CLI reference - https://docs.docker.com/reference/cli/docker/context/
- Docker Docs: `docker context use` CLI reference - https://docs.docker.com/reference/cli/docker/context/use/
- Docker Docs: Docker CLI reference and environment variables - https://docs.docker.com/reference/cli/docker/
- Docker Docs: Protect the Docker daemon socket - https://docs.docker.com/engine/security/protect-access/
- Docker Docs: Docker Compose CLI reference - https://docs.docker.com/compose/reference/
- Local Docker CLI help output for `docker --help`, `docker context create --help`, `docker context update --help`, `docker context export --help`, `docker context import --help`, and `docker context ls --help`

## Issues Found
- The post stated that `DOCKER_HOST` takes precedence over everything. Current Docker CLI documentation and local CLI help state that `--context` overrides `DOCKER_HOST`, and Docker documents `DOCKER_CONTEXT` as overriding `DOCKER_HOST` and the default context. Updated the text to describe `DOCKER_HOST` as a direct host override while noting that `--context` and `DOCKER_CONTEXT` override it.
- One SSH context example was labeled as creating a context with a specific SSH key, but the command only set an SSH endpoint and description. Updated the comment to say it creates a context with a description.
- The remote access requirements said the user must be in the `docker` group "or using sudo." Docker's SSH context documentation requires the remote user to have permission to access the Docker socket; Docker contexts do not automatically make ordinary commands run with sudo. Updated the requirement to socket access permission.
- The security section framed Docker group membership as a limited permission. Docker socket access is effectively root-equivalent on the host. Updated the wording to treat Docker socket access as root-equivalent and advise restricting the SSH account.

## Review Notes
The remaining commands and examples match current Docker CLI behavior: context creation and update syntax, TCP TLS endpoint keys, persistent and per-command context switching, `DOCKER_CONTEXT`, context import/export, Go-template formatting for `docker context ls`, and Docker Compose usage through `docker compose`.
