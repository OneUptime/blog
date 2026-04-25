# Validation Summary: Pinning Image Versions for Reproducible Deployments in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker images, tags, and digests
- Docker Compose / Compose Specification
- CI/CD automation with `curl` and the Portainer API

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose top-level `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose variable interpolation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker `image pull` reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker `image inspect` reference: https://docs.docker.com/reference/cli/docker/image/inspect/
- Portainer stack management docs: https://docs.portainer.io/sts/user/docker/stacks
- Portainer stack edit docs: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer stack creation docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Hub metadata for `nginx:1.25.4`: https://hub.docker.com/v2/namespaces/library/repositories/nginx/tags/1.25.4
- Docker Hub metadata for `postgres:16.2-alpine`: https://hub.docker.com/v2/namespaces/library/repositories/postgres/tags/16.2-alpine
- Docker Hub metadata for `redis:7.2.4-alpine`: https://hub.docker.com/v2/namespaces/library/repositories/redis/tags/7.2.4-alpine
- Docker Hub metadata for `node:20.11.0-alpine`: https://hub.docker.com/v2/namespaces/library/repositories/node/tags/20.11.0-alpine

## Issues Found
- The post said that tag pinning ensures every deployment pulls exactly the same image version. That is too strong because tags are mutable, so I changed the sentence to describe tag pinning as safer than `latest` rather than immutable.
- The `nginx` digest example was not the published digest for the pinned example version. I replaced it with the manifest-list digest currently published for `nginx:1.25.4`.
- The digest lookup command used generic `docker inspect`. I changed it to `docker image inspect` to match the current image-specific CLI reference.
- The Compose snippets used top-level `version: "3.8"`. Docker's current Compose docs mark the `version` key as obsolete, so I removed it from the examples.
- The Portainer API example was incomplete for current documented behavior. I updated it to use the documented file-based stack update endpoint with the required `endpointId` query parameter, JSON `Content-Type`, the correct `StackFileContent` field, and `RepullImageAndRedeploy`.
- The `versions.env` sentence implied Portainer could directly consume that file without clarification. I rewrote it to say the values should be loaded into Portainer as stack environment variables during deployment.

## Review Notes
- The hardcoded example tags (`nginx:1.25.4`, `postgres:16.2-alpine`, `redis:7.2.4-alpine`, and `node:20.11.0-alpine`) are valid as of April 25, 2026, but they are older pinned examples rather than current releases.
- Portainer's `PUT /api/stacks/{id}` update endpoint applies to file-based stacks. Git-backed stacks use separate Git update and redeploy endpoints.
- Docker Compose CLI interpolation rules and Swarm deployment behavior are not identical. Portainer supports stack environment variables in its own workflow, but raw Compose `.env` behavior should not be assumed to map 1:1 to Swarm.
