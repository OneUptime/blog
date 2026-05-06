# Validation Summary: How to Back Up Docker Volumes via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker volumes
- Bind mounts
- NFS
- CIFS/SMB
- `tar`

## Sources Consulted
- Docker Docs: `docker volume create` https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Volumes https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: `docker volume ls` https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: `docker volume prune` https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: `docker system df` https://docs.docker.com/reference/cli/docker/system/df/
- Portainer Docs: Volumes https://docs.portainer.io/user/docker/volumes
- Portainer Docs: Add a new volume https://docs.portainer.io/user/docker/volumes/add
- Portainer Docs: Advanced container settings https://docs.portainer.io/user/docker/containers/advanced
- Local Docker CLI help: `docker volume prune --help` and `docker system df --help` on Docker 29.4.2

## Issues Found
- The description and introduction implied that Portainer's `Volumes` page manages bind mounts and performs the backup directly. I corrected this to distinguish Portainer volume management from bind mount configuration and the Docker CLI backup step, matching the Portainer documentation.
- The cleanup example claimed `docker volume prune` removes all unused volumes. Current Docker behavior only removes unused anonymous volumes unless `-a` is provided, so I changed the command to `docker volume prune -a`.

## Review Notes
- The `local` volume driver options shown for `tmpfs`, NFS, and CIFS are Linux-oriented. Docker's official CLI reference notes that the built-in `local` driver accepts no options on Windows.
- The backup example is valid for creating a `.tar.gz` archive of a named volume by mounting both the volume and a host backup directory into a temporary container.
