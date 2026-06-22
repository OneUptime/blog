# Validation Summary: How to Export and Import Docker Images (save, load, and transfer)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker images
- Docker containers
- Docker image archives and compression tools
- SSH/SCP file transfer
- Bash scripting

## Sources Consulted
- Docker Docs: docker image save - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: docker image load - https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs: docker container export - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Docs: docker image import - https://docs.docker.com/reference/cli/docker/image/import/
- Local Docker CLI help: `docker save --help`, `docker load --help`, `docker export --help`, `docker import --help`, `docker images --help`, `docker history --help`

## Issues Found
- The compression comparison table showed `docker save` commands without an image argument, such as `docker save > file.tar`. Docker's documented syntax requires at least one `IMAGE` argument. Updated each command in that table to use `docker save image:tag ...`.

## Review Notes
The Docker command descriptions, flags, save/load behavior, export/import distinction, and transfer examples are consistent with the current Docker CLI documentation. Docker's `load` command can also read supported compressed archives directly, but the explicit decompression examples in the post are still valid.
