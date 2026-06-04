# Validation Summary: How to Use Docker Local Volume Driver with Custom Options

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine volumes
- Docker local volume driver
- Docker CLI
- Docker Compose
- Linux mount options
- tmpfs
- ext4 block devices
- bind mounts
- NFS

## Sources Consulted
- Docker Docs: docker volume create CLI reference - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Volumes storage manual - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help: `docker volume create --help`
- Local Docker CLI help: `docker run --help`

## Issues Found
- The post said tmpfs is useful for sensitive data that should "never touch disk." Docker's tmpfs documentation notes that Linux tmpfs data may be written to swap, so this was too absolute. Changed the wording to say tmpfs data should not persist after the container stops and added the swap caveat.
- The Compose example used the obsolete top-level `version: "3.8"` field and called the file `docker-compose.yml`. Modern Docker Compose uses the Compose Specification, where `version` is only informative and emits an obsolete warning. Removed the `version` line and updated the example filename and surrounding text to `compose.yaml`.

## Review Notes
The remaining Docker CLI commands and Compose `driver_opts` examples match Docker's official documentation for local driver options, named bind-style volumes, tmpfs options, NFS volumes, and block-device-style local volumes. The examples are Linux-oriented; the Docker local driver accepts these mount-style options on Linux and Docker Desktop, but not on Windows.
