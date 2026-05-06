# Validation Summary: How to Commit a Container to a New Image in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Portainer API
- Docker Engine API

## Sources Consulted
- Portainer Docs: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer Docs: API usage examples - https://docs.portainer.io/api/examples
- Docker Docs: `docker container commit` - https://docs.docker.com/reference/cli/docker/container/commit/
- Docker Docs: Docker Engine API reference (`POST /commit`) - https://docs.docker.com/reference/api/engine/version/v1.49/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Services - https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post body did not actually explain Portainer's documented create-image workflow. It focused on inspection and monitoring instead of committing a container to an image. I replaced the main workflow and command examples with commit-specific steps.
- The prerequisites and navigation steps incorrectly implied Kubernetes environments and Stacks were relevant. I corrected them to Docker, Swarm, or Podman environments and the **Containers** view, which is where Portainer documents this feature.
- The Compose snippet was unrelated to the task and used the obsolete top-level `version` field. Its `deploy` section is also optional and may be ignored if the platform does not implement it. I removed it and replaced it with commit-specific guidance.
- The API example listed containers instead of committing one. I replaced it with a real Portainer Docker-gateway `POST /commit` example.
- The API example used a JWT login flow rather than Portainer's current documented access-token pattern for routine API usage. I updated it to use `X-API-Key` with a Portainer access token.
- The original post omitted two important commit caveats. I added that mounted volumes are not included in committed images and that Docker pauses running containers during commit by default.

## Review Notes
- Portainer documentation confirms that the container details page can create an image from a deployed container, but it does not document every field shown in that UI dialog. The revised post keeps the UI steps at the documented level and uses Docker CLI/API examples for the exact commit options.
- Portainer documentation explicitly says "deployed container" and does not state whether the UI action is limited to running or stopped containers, so the revised post avoids making that claim.
- For repeatable long-term image creation, a Dockerfile remains a better approach than committing a live container snapshot.
