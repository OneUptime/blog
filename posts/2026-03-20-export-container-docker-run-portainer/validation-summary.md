# Validation Summary: How to Export Container Configuration as Docker Run Command - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker CLI
- Portainer API
- `jq`

## Sources Consulted
- Portainer Docs: Inspect a container - https://docs.portainer.io/user/docker/containers/inspect
- Portainer Docs: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Docs: Containers - https://docs.portainer.io/2.33-lts/user/docker/containers
- Portainer Docs: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Docker Docs: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker container logs` - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: Compose file `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post claimed Portainer could export a container directly as a `docker run` command. The official Portainer docs document inspect, view, and duplicate/edit actions, but not a one-click export-to-CLI feature. I corrected the title, description, introduction, and conclusion to describe the supported workflow: inspect in Portainer, then recreate the command manually.
- The prerequisites and UI navigation referenced Kubernetes environments and Stacks, which are not the relevant Portainer workflow for reconstructing a Docker container as `docker run`. I narrowed those references to the Docker Containers flow.
- The "Key Configuration Options" example used a Compose file with the obsolete top-level `version` field and did not match the article's stated goal of producing a `docker run` command. I replaced it with a valid `docker run` example that maps the inspected settings to CLI flags.
- The `docker logs` example used a non-reference option order. I changed it to `docker logs --tail 100 container-name` to match the Docker CLI reference format.
- The troubleshooting section referenced an unverified `Settings > Environments > Re-sync` path in Portainer. I replaced it with accurate guidance to confirm the selected environment and reload the Containers view.
- The resource-limits troubleshooting example emphasized `CpuShares`, which is a relative weight rather than a hard limit in Docker. I changed the example to inspect the full `HostConfig` instead.
- The Portainer API example was updated to use the documented HTTPS default port `9443` and `?all=true` so the container-listing example matches the documented Portainer gateway pattern for listing all containers.

## Review Notes
- Portainer's current documentation also recommends API access tokens with the `X-API-Key` header for routine API access. The post's JWT-based `/api/auth` workflow remains documented and valid.
- The `docker exec -it container-name /bin/sh` example is only valid when the image includes `/bin/sh`.
