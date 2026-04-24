# Validation Summary: How to Remove Docker Networks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker networking
- Docker Compose

## Sources Consulted
- Docker Docs: `docker network prune` - https://docs.docker.com/reference/cli/docker/network/prune/
- Docker Docs: `docker network rm` - https://docs.docker.com/reference/cli/docker/network/rm/
- Docker Docs: `docker network disconnect` - https://docs.docker.com/reference/cli/docker/network/disconnect/
- Docker Docs: `docker network ls` - https://docs.docker.com/reference/cli/docker/network/ls/
- Docker Docs: `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs: `docker container prune` - https://docs.docker.com/reference/cli/docker/container/prune/
- Docker Docs: `docker compose down` - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: `docker network create` - https://docs.docker.com/reference/cli/docker/network/create/
- Portainer Docs: Remove a network - https://docs.portainer.io/sts/user/docker/networks/remove
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add

## Issues Found
- The post used `docker network prune --dry-run`, but the current Docker CLI does not support a `--dry-run` option for `docker network prune`. I replaced it with an accurate note telling readers to review networks first and then prune in Step 6.
- The post used `docker container prune --filter "network=stuck-network"`, but `docker container prune` only supports `until` and `label` filters. I replaced that recovery flow with documented `docker network disconnect` commands followed by `docker network rm`.
- The container-listing example depended on `jq` without declaring it as a prerequisite. I replaced it with `docker ps -a --filter "network=..." --format "{{.Names}}"`, which is covered by Docker's official CLI reference.
- The Docker Compose section implied Compose-created networks are always auto-removed when a stack is removed. I corrected this to match `docker compose down` behavior: Compose-created networks are removed by `docker compose down`, but external networks are not.
- The Portainer cleanup wording referenced a dedicated cleanup/prune action that is not documented in the current Portainer network-removal docs. I changed that wording to the documented workflow of removing unused networks from the Networks list after confirming no containers are attached.

## Review Notes
- Portainer's official docs clearly document removing networks and the requirement to detach containers first, but they do not currently document a dedicated network-prune action comparable to `docker network prune`.
- Docker's default `bridge` network is explicitly documented as non-removable. Docker also treats `host` and `none` as built-in system networks.
