# Validation Summary: How to Set Environment Variables on a Container in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker containers
- Docker Compose / Compose Specification
- Docker Swarm secrets
- PostgreSQL Docker Official Image

## Sources Consulted
- Portainer: Add a new container - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer: Inspect a container - https://docs.portainer.io/user/docker/containers/inspect
- Portainer: Secrets - https://docs.portainer.io/user/docker/secrets
- Portainer: Edit or duplicate a container - https://docs.portainer.io/2.21/user/docker/containers/edit
- Docker CLI reference: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference: `docker container update` - https://docs.docker.com/reference/cli/docker/container/update/
- Docker Engine: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Compose: Manage secrets securely in Docker Compose - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose reference: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL Docker Official Image - https://hub.docker.com/_/postgres

## Issues Found
- The post said container environment variables were under an `Env` tab during container creation. Current Portainer docs document this under **Advanced container settings** in the **Environment Variables** section, so I corrected the navigation text.
- The post said to verify variables in an `ENV` section of the **Inspect** tab. Current Portainer docs document environment variables on the container details page and raw inspection under **Inspect**, so I updated the verification steps to match the documented UI.
- The post described Portainer secrets as a Business Edition feature and said they could be referenced in a container or stack. Portainer documents the **Secrets** menu for Docker Swarm environments, and Docker documents secrets as available to Swarm services rather than standalone containers, so I corrected this to Swarm-only guidance and changed the wording to **service or stack**.
- The Compose example used the top-level `version: "3.8"` field. Docker now documents the top-level `version` element as obsolete, so I removed it from the example.

## Review Notes
- The `.env` import workflow for container environment variables is supported in current Portainer docs.
- The `_FILE` pattern used in `POSTGRES_PASSWORD_FILE` is valid for the Docker Official `postgres` image in the example, but `_FILE` variables are image-specific conventions rather than a universal Docker feature.
