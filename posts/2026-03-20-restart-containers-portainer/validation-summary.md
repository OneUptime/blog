# Validation Summary: How to Restart Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer
- Docker Engine API
- Docker CLI
- curl
- Bash
- Python JSON parsing

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer Docker container details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer Docker roles and permissions documentation: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Docker Engine API v1.54 reference: https://docs.docker.com/reference/api/engine/version/v1.54/
- Docker Engine API overview and versioning: https://docs.docker.com/reference/api/engine/
- Docker CLI `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI `docker container inspect` reference: https://docs.docker.com/reference/cli/docker/container/inspect/

## Issues Found
- The Portainer authentication payload used lowercase `username` and `password` fields. Portainer's current API schema and examples document `Username` and `Password`, so the JSON payload was updated to match the documented field names.
- The container lookup truncated the Docker container ID to 12 characters before using it in API requests. Docker often accepts unique prefixes, but the Docker Engine API parameter is documented as an ID or name, so the example now passes the full `Id` value returned by `/containers/json`.
- The duplicate-container `docker run` snippet placed a shell comment inside a backslash-continued command. That causes the image name line to be interpreted as a separate shell command if copied. Moved the guidance into comments above the command.
- The duplicate-container inspection command only printed `.Config`, which omits important host-side settings such as port bindings and mounts. Updated it to print the full `docker inspect` output so the user can review container configuration, host settings, and mounts before recreating the container.

## Review Notes
- The Portainer Docker proxy path `/api/endpoints/<ENVIRONMENT_ID>/docker` matches Portainer's documented gateway pattern for forwarding Docker Engine API calls.
- The Docker Engine API endpoints used for list, start, stop, restart, kill, pause, unpause, inspect, and forced delete are current and match the documented container lifecycle operations.
- Portainer's current user-facing API docs recommend long-lived access tokens with the `X-API-Key` header for API automation. The post's JWT bearer-token flow is still documented in the Portainer API usage examples, with the caveat that JWTs are time-limited.
