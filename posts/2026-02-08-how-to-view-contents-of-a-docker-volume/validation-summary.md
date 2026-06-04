# Validation Summary: How to View Contents of a Docker Volume

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker volumes
- Docker Compose
- Alpine Linux / BusyBox utilities
- File Browser container image

## Sources Consulted
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker volume inspect - https://docs.docker.com/reference/cli/docker/volume/inspect/
- Docker Docs: Docker Compose volumes - https://docs.docker.com/reference/compose-file/volumes/
- Docker CLI local help output for `docker run`, `docker volume ls`, `docker inspect`, `docker cp`, `docker exec`, `docker rm`, and `docker compose ps`
- BusyBox local help output for `grep`, `sort`, `stat`, `tar`, and `du`
- File Browser Docs: Docker installation - https://filebrowser.org/installation
- File Browser Docs: CLI options and environment variables - https://filebrowser.org/cli/filebrowser

## Issues Found
- The File Browser example published host port 8080 to container port 8080. The official `filebrowser/filebrowser` Docker example maps host port 8080 to container port 80, so the command was changed to `-p 8080:80`.
- The largest-files example left `sort` and `head` on the host shell side of the pipeline. The command was changed to run the full pipeline inside Alpine with `sh -c`, making it match the stated container-based inspection method.
- The recursive grep example used `grep --include`, which is not supported by BusyBox `grep` in a default Alpine container. It was replaced with `find ... -exec grep -H ... {} +`.
- The specific-file export example used `tar -T`, which is not supported by BusyBox `tar` in a default Alpine container. It now installs GNU tar in the temporary Alpine container and uses `--files-from=-` with null-delimited input.

## Review Notes
The Docker volume, `docker inspect`, `docker cp`, `docker exec`, Docker Compose label, and Linux mountpoint explanations are consistent with current Docker documentation. Docker Desktop also has a built-in Volumes view that can inspect and export volumes, but the post's CLI-focused methods remain technically valid.
