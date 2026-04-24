# Validation Summary: How to Build a Self-Healing Container System with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker Compose
- Docker health checks
- Docker restart policies
- Python 3
- `requests`

## Sources Consulted
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Start containers automatically: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Engine API v1.44, `ContainerList`: https://docs.docker.com/reference/api/engine/version/v1.44/#tag/Container/operation/ContainerList
- Docker Engine API v1.44, `ContainerInspect`: https://docs.docker.com/reference/api/engine/version/v1.44/#tag/Container/operation/ContainerInspect
- Docker Engine API v1.44 OpenAPI specification: https://docs.docker.com/reference/api/engine/version/v1.44.yaml
- Portainer Docs, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer Docs, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE API documentation 2.39.1: https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer CE API OpenAPI specification 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
- The Compose snippets used the top-level `version: '3.8'` field. Docker now documents the `version` top-level element as obsolete under the Compose Specification, so I removed it from both YAML examples.
- The comment for `restart: unless-stopped` was incorrect. Docker documents `unless-stopped` as restarting irrespective of exit code until the container is explicitly stopped, so I corrected the restart-policy comments to match Docker's documented behavior.
- The introduction blurred the roles of restart policies and health checks. I clarified that restart policies recover containers when the main process exits, while health checks mark a running container as unhealthy for higher-level automation to act on.
- The Python sample hard-coded `PORTAINER_URL`, API key, and endpoint ID even though the Portainer stack example passed them as environment variables. I updated the script to read `PORTAINER_URL`, `PORTAINER_API_KEY`, and `ENDPOINT_ID` from the environment so the deployment example works as written.
- The healing loop tried to read `Health.Status` from the `GET /containers/json` response. Docker's `ContainerList` endpoint returns a smaller summary object, while health status is exposed under `State.Health` in `ContainerInspect`, so I added an inspect call for running containers and read health from `State.Health.Status`.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The `redeploy_stack` helper remains illustrative; Portainer documents `PUT /stacks/{id}` as an update path for file-based stacks, and the main loop in this tutorial still performs restart-based remediation only.
- The `api` healthcheck assumes the application image includes `curl`, and the `self-healer` stack installs `requests` at container start. Both are workable for a tutorial, but a production version would usually bake those dependencies into the image.
