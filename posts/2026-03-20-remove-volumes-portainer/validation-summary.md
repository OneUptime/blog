# Validation Summary: How to Remove Volumes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker volumes
- Bind mounts
- NFS-backed Docker volumes
- CIFS/SMB-backed Docker volumes

## Sources Consulted
- Portainer volumes overview: https://docs.portainer.io/user/docker/volumes
- Portainer remove volume flow: https://docs.portainer.io/user/docker/volumes/remove
- Portainer add volume options: https://docs.portainer.io/user/docker/volumes/add
- Portainer container volume and bind mount settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker volumes guide: https://docs.docker.com/engine/storage/volumes/
- Docker `docker volume ls` reference: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker `docker volume prune` reference: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The opening explanation said Portainer's Volumes page manages bind mounts. I corrected this to clarify that the Volumes page manages Docker volumes, while bind mounts are configured in container settings.
- The Portainer section did not include the documented deletion flow or the restriction on attached containers. I updated it to match Portainer's documented remove workflow and noted that attached volumes cannot be removed until the container is removed.
- The cleanup section said `docker volume prune` removes all unused volumes. I corrected this because Docker documents that `docker volume prune` removes only unused anonymous volumes by default, and I added `docker volume prune --all` for unused named volumes.

## Review Notes
- The `docker volume create` examples that use `--opt` with the `local` driver are documented for Linux hosts and Docker Desktop, not native Windows Engine hosts in the same form.
- `docker volume prune --all` is documented as an API 1.42+ option, so very old Docker Engine releases may not support it.
