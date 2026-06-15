# Validation Summary: How to Debug Docker Container File System Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Docker storage drivers and writable container layers
- Docker volumes, bind mounts, and tmpfs mounts
- Dockerfile file ownership with COPY --chown
- Linux filesystem permissions and security modules

## Sources Consulted
- Docker CLI reference: docker system df - https://docs.docker.com/reference/cli/docker/system/df/
- Docker CLI reference: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference: docker container ls - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: docker volume inspect - https://docs.docker.com/reference/cli/docker/volume/inspect/
- Docker CLI reference: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: docker exec, docker cp, and docker export - https://docs.docker.com/reference/cli/docker/container/exec/, https://docs.docker.com/reference/cli/docker/container/cp/, https://docs.docker.com/reference/cli/docker/container/export/
- Docker prune documentation - https://docs.docker.com/engine/manage-resources/pruning/
- Docker storage documentation - https://docs.docker.com/engine/storage/
- Docker storage drivers documentation - https://docs.docker.com/engine/storage/drivers/
- Docker volumes documentation - https://docs.docker.com/engine/storage/volumes/
- Docker tmpfs documentation - https://docs.docker.com/engine/storage/tmpfs/
- Docker Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Dockerfile reference for COPY --chown - https://docs.docker.com/reference/dockerfile/
- Local Docker CLI help output from Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The "Find largest volumes" shell pipeline parsed `{{.Name}}: {{.Mountpoint}}` with `cut -d: -f2`, which leaves a leading space before the mount path and can cause `du` to inspect a non-existent path. I changed the inspect format to tab-delimited fields and used shell `read -r` loops so the path is passed to `du` correctly.
- The read-only volume inspection command displayed `.Mode` and said mode `ro` indicates read-only. Docker inspect also exposes `.RW`, and `.Mode` may contain other mount option strings or be empty depending on mount type. I changed the template to render `rw` or `ro` from `.RW`, which directly reflects Docker's mount read/write state.

## Review Notes
- Most commands are valid current Docker CLI usage. Some diagnostic commands, such as `lsof`, `strace`, `ausearch`, direct reads under `/var/lib/docker`, and overlay directory inspection, depend on host OS, privileges, installed packages, and Docker Desktop versus native Linux Engine behavior.
- Current Docker installations may report storage drivers or snapshotters differently depending on Engine version and image store configuration. The overlay/overlay2 guidance remains relevant for Linux Docker Engine environments that use overlay-backed storage.
