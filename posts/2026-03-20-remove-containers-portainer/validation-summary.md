# Validation Summary: How to Remove Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Engine API
- Bash
- Python 3

## Sources Consulted
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer remove a container documentation: https://docs.portainer.io/user/docker/containers/remove
- Portainer view a container's details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer edit or duplicate a container documentation: https://docs.portainer.io/2.27/user/docker/containers/edit
- Docker CLI `docker container rm` reference: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/

## Issues Found
- The API example truncated the container ID to 12 characters before calling Portainer's Docker proxy endpoints. I changed it to use the full `Id` value and stop after the first match, which is the safest documented form for Docker Engine API paths.
- The `Duplicate a Container` shell example was not valid as written because the line continuation before the inline comment broke the `docker run` command, and the `docker inspect --format '{{json .Config}}'` output alone was not sufficient to recreate the full container runtime configuration. I replaced that block with Portainer's documented `Duplicate/Edit` workflow.

## Review Notes
- Portainer's official API examples now often show access tokens passed with `X-API-Key`, but JWT bearer authentication through `POST /api/auth` is still documented and valid.
- No other technical issues were found after these corrections.
