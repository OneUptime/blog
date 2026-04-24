# Validation Summary: How to Remove Volumes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose
- Bash

## Sources Consulted
- Docker Docs: `docker volume prune` https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: `docker volume ls` https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: `docker container ls` https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs: `docker container rm` https://docs.docker.com/reference/cli/docker/container/rm/
- Docker Docs: `docker compose down` https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: `docker system prune` https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Docs: Volumes overview https://docs.docker.com/engine/storage/volumes/
- Portainer Docs: Volumes https://docs.portainer.io/user/docker/volumes
- Portainer Docs: Remove a volume https://docs.portainer.io/2.33-lts/user/docker/volumes/remove
- Portainer Docs: Remove a stack https://docs.portainer.io/user/docker/stacks/remove

## Issues Found
- The post said `docker volume prune` removes all unused volumes. Current Docker docs state it removes unused anonymous volumes by default; unused named volumes require `--all`. Updated the prune examples and warnings accordingly.
- The post claimed prune would include volumes from stopped containers. Docker docs define unused volumes as volumes not referenced by any container, including stopped containers. Updated the explanation to reflect that stopped-container references prevent pruning.
- The container/volume verification examples relied on `docker ps` volume filtering in a way that could mislead readers about stopped containers. Replaced the stopped-container check with an inspect-based example that works across existing containers and kept a separate running-container check.
- The Docker Compose cleanup notes overstated what `docker compose down --volumes` removes. Updated the text to reflect that it removes declared non-external named volumes plus attached anonymous volumes, while external volumes are not removed.
- The Portainer stack-removal instructions referenced a volume-removal checkbox that is not documented in the current Portainer stack removal docs. Replaced that with the documented stack removal flow and clarified that unused volumes should be removed separately if intended.
- The development cleanup example overstated `docker system prune --volumes`. Updated it to `docker system prune -a --volumes --force` and corrected the warning to match current Docker behavior: unused images are removed, but volumes are limited to anonymous volumes.
- The production cleanup script had a logic bug: it exited before deletion whenever the size check did not prompt for confirmation. Reworked the confirmation block and changed the usage check to a `docker volume ls --filter dangling=true` check that matches Docker’s documented meaning of an unreferenced volume.
- The automation example claimed retention-date behavior without implementing it. Removed that claim so the script accurately reflects what it does.

## Review Notes
- Portainer UI details can vary by release. The Docker CLI behavior was validated against current official Docker documentation, and the Portainer UI flow was checked against current Portainer documentation.
- `docker volume prune --all` is required for unused named volumes in current Docker releases; without `--all`, only anonymous volumes are pruned.
