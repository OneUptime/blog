# Validation Summary: How to Recreate a Container with Updated Settings in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API
- Docker Engine API
- Docker CLI
- Bash
- `curl`
- Python 3 `json` parsing

## Sources Consulted
- Portainer "Edit or duplicate a container": https://docs.portainer.io/user/docker/containers/edit
- Portainer "API usage examples": https://docs.portainer.io/api/examples
- Portainer "Accessing the Portainer API": https://docs.portainer.io/api/access
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI formatting reference: https://docs.docker.com/engine/cli/formatting/
- Docker `docker container rm` reference: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker "Running containers" reference: https://docs.docker.com/engine/containers/run/

## Issues Found
- The UI section described generic start/stop/remove actions instead of Portainer's documented recreate flow. Updated it to the supported `Duplicate/Edit` -> `Deploy the container` -> `Replace` workflow for updating an existing container.
- The API section listed assorted lifecycle operations but did not actually recreate a container with updated settings. Rewrote it to show the relevant recreate sequence through Portainer's Docker API gateway: inspect the current container, stop and remove it, create the replacement container, then start the replacement.
- The API example truncated the container ID to 12 characters. Docker can often resolve short IDs, but Portainer's API examples use the full returned ID, so I updated the example to use the full value and avoid ambiguity.
- The duplicate example only inspected `.Config`, which omits important runtime settings such as host configuration, port bindings, and mounts. Changed it to `docker inspect my-container` so the example captures the full container definition.
- The multiline `docker run` example put a shell comment after a trailing backslash, which comments out the remainder of the continued line and breaks the intended command. Moved that note into prose and kept the command itself valid.

## Review Notes
- Portainer currently documents two valid authentication patterns: JWTs returned by `/api/auth` with an `Authorization: Bearer ...` header, and per-user API tokens passed with `X-API-Key`. The post's JWT-based authentication flow remains valid.
- Recreating a container with the same name and host port bindings still requires a short stop/remove/create/start window. Preparing the replacement payload before stopping the original container is what minimizes downtime in the API workflow.
- The verified Portainer UI workflow and API examples matched the current Portainer documentation on 2026-04-23.
