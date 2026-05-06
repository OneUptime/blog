# Validation Summary: How to Check Container Health Status in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Docker health checks
- Portainer API
- `jq`

## Sources Consulted
- Portainer container details: https://docs.portainer.io/user/docker/containers/view
- Portainer container inspect: https://docs.portainer.io/user/docker/containers/inspect
- Portainer container logs: https://docs.portainer.io/user/docker/containers/logs
- Portainer API documentation and examples: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker `docker container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker container health check behavior: https://docs.docker.com/engine/containers/run/
- Docker Compose `healthcheck` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The prerequisites and UI path were too broad. The post originally included Kubernetes even though the documented `Containers` workflow is under Portainer's Docker/Swarm/Podman section. I corrected the prerequisite and navigation text to keep the instructions aligned with the documented UI.
- The main inspection examples were looking at generic container config instead of health-check data. I changed them to inspect `.State.Health` and `.State.Health.Log`, and clarified where to find the same data in Portainer's `Inspect > Text` view.
- The Compose example used the top-level `version` key, which Docker now documents as obsolete. I removed it.
- The API example used a username/password JWT flow. Current Portainer API docs center access-token authentication with the `X-API-Key` header, so I updated the example accordingly.
- Several Portainer-specific notes were overstated or imprecise. I adjusted them to match the docs for logs, console access, available actions, and container-view troubleshooting.

## Review Notes
- Health status and health check logs are only available when the container defines a Docker health check.
- The sample health check uses `curl`, so the image must include `curl` or an equivalent probe command.
- Portainer's Console feature requires the container image to include a shell.
