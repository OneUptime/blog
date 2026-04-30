# Validation Summary: How to Identify and Clean Up Unused Volumes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker volumes
- NFS-backed Docker volumes
- CIFS/SMB-backed Docker volumes
- Docker bind mounts

## Sources Consulted
- Portainer Volumes documentation: https://docs.portainer.io/user/docker/volumes
- Portainer Add a new volume documentation: https://docs.portainer.io/user/docker/volumes/add
- Portainer Advanced container settings documentation: https://docs.portainer.io/user/docker/containers/advanced
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker CLI `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker CLI `docker volume ls` reference: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker CLI `docker volume prune` reference: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The introduction said Portainer's Volumes section manages bind mounts. I corrected this because Portainer documents bind mounts separately under container volume mappings, while the Volumes section is for Docker volumes. I also clarified Portainer's `unused` label semantics from the official documentation.
- The cleanup section said `docker volume prune` removes all unused volumes. I corrected this because Docker's official CLI reference states that `docker volume prune` removes only unused anonymous volumes by default. I added `docker volume prune -a` to cover unused named volumes as well.
- The comment for `docker volume ls -f dangling=true` was updated from "not used by any container" to "not referenced by any container" to match Docker's official wording for dangling volumes.

## Review Notes
- `docker volume prune -a` is documented as API 1.42+ in the current Docker CLI reference.
- Docker was not installed in this workspace, so command validation was performed against current official documentation rather than local CLI output.
