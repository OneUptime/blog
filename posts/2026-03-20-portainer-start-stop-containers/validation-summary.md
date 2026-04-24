# Validation Summary: How to Start and Stop Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose
- YAML
- Shell scripting

## Sources Consulted
- Docker CLI reference: `docker container stop` - https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference: `docker container kill` - https://docs.docker.com/reference/cli/docker/container/kill/
- Docker CLI reference: `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Compose top-level `version` reference - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Swarm stack deploy reference - https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer: Events (Docker Standalone) - https://docs.portainer.io/2.33-lts/user/docker/events
- Portainer: Docker roles and permissions - https://docs.portainer.io/sts/advanced-topics/docker-roles-and-permissions

## Issues Found
- The post used `docker stop --time 30 my-container`. I changed this to `docker stop --timeout 30 my-container` because Docker's current CLI reference documents `--timeout` as the valid long flag.
- The stop-behavior explanation said `docker stop` always sends `SIGTERM` and waits 10 seconds. I corrected this to note that Docker sends the configured stop signal (`SIGTERM` by default) and that the default timeout is 10 seconds on Linux containers and 30 seconds on Windows containers.
- The `dead` container state was described as "Container failed to start". I corrected this to "Container is defunct and can only be removed" to match Docker's documented meaning of a dead container.
- The stop-timeout section implied this can be configured directly from Portainer's container details UI. I changed the wording to point to the container definition deployed through Portainer, such as a Docker Compose file, because Portainer's current container settings documentation does not document a stop-timeout field there.
- The dependency example used a top-level `version: "3.8"` field. I removed it because Docker documents the top-level `version` property as obsolete in current Compose files.
- The dependency section said this applied to generic "stacks". I narrowed this to Docker Compose-managed applications because current Docker docs distinguish modern Compose files from Swarm stack deployment, which still uses the legacy Compose v3 format.
- The events section was made more precise by noting that Portainer's Events view is documented for Docker Standalone environments.

## Review Notes
- No additional technical issues were found after the above fixes.
- Docker was not installed in this workspace, so CLI verification was done against Docker's official reference documentation rather than local `--help` output.
- Some exact Portainer UI labels can vary slightly by release, but the reviewed container actions, logs access, and container-details workflows match current Portainer documentation.
