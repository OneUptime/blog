# Validation Summary: How to Browse Volume Contents in Portainer (Swarm/Agent)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker volumes
- Docker bind mounts
- NFS
- CIFS/SMB

## Sources Consulted
- Portainer docs, Volumes: https://docs.portainer.io/user/docker/volumes
- Portainer docs, Browse a volume: https://docs.portainer.io/user/docker/volumes/browse
- Portainer docs, Advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker docs, Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker CLI reference, `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker CLI reference, `docker volume ls`: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker CLI reference, `docker volume prune`: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference, `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/
- Local Docker CLI help: `docker volume create --help`
- Local Docker CLI help: `docker volume ls --help`
- Local Docker CLI help: `docker volume prune --help`

## Issues Found
- The introduction said Portainer's Volumes section manages bind mounts. Portainer's documentation distinguishes Docker volumes from bind mounts, with bind mounts configured in container advanced settings rather than in the Volumes view. I corrected the sentence to describe Docker volumes and supported backends accurately.
- The navigation section did not state the documented requirement for browsing volume contents in Portainer. Portainer's volume browser is only available on environments running Docker Swarm or the Portainer Agent, and the UI action is to click `Browse` next to the volume. I updated the step to match the official behavior.
- The cleanup section said `docker volume prune` removes all unused volumes, but Docker's CLI reference states that `docker volume prune` removes only unused anonymous volumes by default. I changed the command to `docker volume prune -a` so it matches the text and current Docker behavior.

## Review Notes
- The NFS and CIFS/SMB examples rely on the Docker `local` volume driver passing mount options through to the host mount implementation. On Windows hosts, Docker's built-in `local` driver does not accept these driver options, so these examples are effectively Linux-host examples.
