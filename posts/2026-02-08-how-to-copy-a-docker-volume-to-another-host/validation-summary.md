# Validation Summary: How to Copy a Docker Volume to Another Host

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes
- Docker CLI
- Docker images and registries
- SSH and SCP
- rsync
- NFS
- PostgreSQL backups and restores
- tar archives and shell pipelines

## Sources Consulted
- Docker Docs: Volumes, including backup, restore, and migration examples: https://docs.docker.com/engine/storage/volumes/
- Docker Docs: `docker container commit`: https://docs.docker.com/reference/cli/docker/container/commit/
- Docker Docs: `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs: `docker image push`: https://docs.docker.com/reference/cli/docker/image/push/
- Docker Docs: Docker contexts: https://docs.docker.com/engine/manage-resources/contexts/
- Docker Docs: Docker CLI global `--context` option: https://docs.docker.com/reference/cli/docker/
- Docker Hub: PostgreSQL Official Image documentation: https://hub.docker.com/_/postgres
- PostgreSQL Docs: `pg_dumpall`: https://www.postgresql.org/docs/17/app-pg-dumpall.html
- Local CLI help for Docker, rsync, scp, and ssh.

## Issues Found
- The `rsync` section showed the synchronization command before creating the destination Docker volume, even though the destination path depends on Docker creating and tracking the volume. Moved the `docker volume create mydata` step before the `rsync` command.
- The `rsync` command wrote to `/var/lib/docker/volumes/...` on the destination as an unprivileged remote user. Added `--rsync-path="sudo rsync"` so the remote side can write to Docker's managed volume directory when sudo is configured.
- The Docker Save/Load method attempted to commit a container that only mounted the volume data at `/data`. Docker commits explicitly exclude mounted volume data, so the image would not contain the volume contents. Changed the example to copy the volume data into `/snapshot` inside the container filesystem before committing, then copy from `/snapshot` into the destination volume.
- The NFS source copy wrote into `/dest/mydata-backup/` without first creating that directory. Changed the command to create the directory before copying.

## Review Notes
- The tar-over-SSH, Docker context, `docker save`/`docker load`, registry, and PostgreSQL dump/restore examples are technically valid for the described use cases.
- Direct filesystem access to `/var/lib/docker/volumes/...` is practical on Linux hosts but can vary on Docker Desktop or non-default Docker data roots. The post already uses `docker volume inspect` to find the mountpoint, which is the correct way to discover the path.
- Raw database volume copies should only be done while the database is stopped or otherwise made consistent; the post correctly calls this out.
