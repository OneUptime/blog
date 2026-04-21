# Validation Summary: How to Deploy Stacks with Named Volumes and NFS Mounts in Portainer (3)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Docker named volumes
- Docker local volume driver
- NFS-backed volumes
- CIFS/SMB-backed volumes
- Docker volume labels

## Sources Consulted
- Docker Docs: Compose file reference, Volumes - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose file reference, Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Engine storage, Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker volume create CLI reference - https://docs.docker.com/reference/cli/docker/volume/create/
- Portainer Documentation: Add a new stack - https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- Removed the obsolete top-level `version: "3.8"` field from the Compose example. Current Docker Compose uses the Compose Specification and treats the top-level `version` property as obsolete and only informational.
- Clarified the explicit volume name comment and summary wording. Compose `name` creates a stable Docker volume name that is not scoped with the stack/project name, so explicit names are useful when stable names are needed rather than a universal requirement.
- Changed "Label volumes to enable automated backups" to "Label volumes so backup tooling can identify them." Docker volume labels are metadata; they do not perform backups by themselves.

## Review Notes
The remaining Compose volume examples match the documented syntax for top-level named volumes, `driver_opts`, NFS/CIFS options through the Docker local volume driver, volume labels, and read-only mounts. In real deployments, NFS and CIFS mounts still depend on the Docker host being able to resolve and mount the remote share, including any required host packages, network access, and credentials.
