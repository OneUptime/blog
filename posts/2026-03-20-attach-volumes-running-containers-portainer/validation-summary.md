# Validation Summary: How to Attach Volumes to Running Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker named volumes
- Docker bind mounts
- NFS-backed Docker volumes
- CIFS/SMB-backed Docker volumes
- tmpfs volumes

## Sources Consulted
- Portainer Documentation: Attach a volume to a container - https://docs.portainer.io/2.27/user/docker/containers/attach-volume
- Portainer Documentation: Edit or duplicate a container - https://docs.portainer.io/user/docker/containers/edit
- Portainer Documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation: Volumes - https://docs.portainer.io/user/docker/volumes
- Portainer Documentation: Add a new volume - https://docs.portainer.io/user/docker/volumes/add
- Docker Docs: `docker volume create` - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Manage data in Docker with volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: `docker volume ls` - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: `docker volume prune` - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The introduction said Portainer's Volumes section manages bind mounts. I corrected this because Portainer documents bind mounts under a container's Advanced container settings, while the Volumes section is for named volumes and external storage-backed volumes.
- The Portainer workflow for attaching a volume to an existing running container was not stated clearly enough. I updated the navigation section to reflect Portainer's documented `Duplicate/Edit` workflow and the fact that Portainer replaces the running container with a recreated one when adding the new mount.

## Review Notes
- The Docker CLI examples and flags used in the post are valid against current Docker documentation.
- Docker recommends `--mount` over `-v` for new examples, but `-v` remains supported and the post's commands are still correct.
- Driver options for the built-in `local` volume driver are supported on Linux and Docker Desktop; they are not supported with the built-in `local` driver on Windows.
