# Validation Summary: How to Use Portainer for Automotive Edge Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Edge Agent
- Portainer Edge Stacks
- Portainer Edge Groups
- Portainer HTTP API
- Docker Engine
- Docker Compose
- Bash
- Python 3

## Sources Consulted
- Portainer documentation: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer documentation: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer documentation: Add a new Edge Stack - https://docs.portainer.io/user/edge/stacks/add
- Portainer documentation: Edge Stacks - https://docs.portainer.io/user/edge/stacks
- Portainer documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer API spec: CE 2.39.1 OpenAPI definition - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer agent repository: deployment options and Edge-mode environment variables - https://github.com/portainer/agent
- Docker documentation: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker documentation: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker documentation: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker documentation: Running containers - https://docs.docker.com/engine/containers/run/
- Docker documentation: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker documentation: Compose deploy specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker documentation: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- Step 1 used a custom systemd watchdog service whose `ExecStart` pipeline would not run as written, and Docker recommends restart policies for container recovery. I removed that block and replaced it with applying the daemon configuration via `systemctl restart docker`.
- Step 2 Edge Agent deployment omitted the documented standalone Edge Agent host mounts, used `portainer/agent:latest`, and misused `EDGE_SERVER_HOST` as the Portainer server URL even though Portainer defines it as the local Edge UI bind address. I updated the command to the documented Edge Agent deployment pattern, switched to `portainer/agent:lts`, and kept the self-signed certificate guidance as a comment.
- Step 3 used a bind-style volume for `/dev/dsrc` instead of a device mapping and referenced an undefined `NODE_ID` variable inside the Compose file. I switched the hardware mapping to `devices` and replaced the undefined ID reference with `PORTAINER_EDGE_ID`.
- Step 4 referenced an undefined `NODE_ID` variable for the charging station identifier. I replaced it with `PORTAINER_EDGE_ID`.
- Step 5 used named volumes without declaring them in a top-level `volumes` block and used a `deploy.resources` memory limit that is less portable for Docker Standalone Compose deployments. I added the missing volume declarations and changed the memory limit to `mem_limit`.
- Step 6 fleet deployment automation could not work as written: it hardcoded Edge Stack ID `1`, attempted regex-style replacement with Python `str.replace()`, and produced invalid JSON for `StackFileContent`. I rewrote it to look up the Edge Group and Edge Stack through the Portainer API and upload the full Compose file content as a valid Edge Stack update payload.
- Step 7 health monitoring grouped environments by parsing the environment name, which is not how Portainer models fleet grouping. I rewrote it to group by Edge Groups using documented API filters and endpoint status values.

## Review Notes
- The top-level Compose `version` field is obsolete in current Docker Compose, but it remains accepted for backward compatibility, so I left it in place.
- The automotive application images and service URLs in the examples appear to be illustrative placeholders rather than official Portainer or Docker artifacts.
- Docker's `get.docker.com` convenience script is officially documented, but production automotive fleets may still prefer a distro-pinned install process outside the scope of this post.
