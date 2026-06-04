# Validation Summary: How to Use docker volume Commands Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker volumes
- Docker CLI
- Docker Compose
- NFS-backed Docker volumes
- tmpfs-backed Docker volumes

## Sources Consulted
- Docker Docs: Volumes, https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker volume CLI reference, https://docs.docker.com/reference/cli/docker/volume/
- Docker Docs: docker volume ls, https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: docker volume create, https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: docker volume inspect, https://docs.docker.com/reference/cli/docker/volume/inspect/
- Docker Docs: docker volume rm, https://docs.docker.com/reference/cli/docker/volume/rm/
- Docker Docs: docker volume prune, https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: docker system df, https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs: Compose file reference, https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose volumes reference, https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose version top-level element, https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help output for `docker volume ls`, `docker volume create`, `docker volume rm`, `docker volume prune`, `docker system df`, and `docker run`

## Issues Found
- The introduction said a container's writable layer disappears when the container stops. Docker keeps the writable layer for stopped containers; it is removed when the container is removed. Updated the wording to say the writable layer disappears when the container is removed.
- The post claimed volumes work identically on Linux and Mac. Docker's official wording is broader and platform-dependent, and local driver options are not identical across host environments. Updated the wording to "Docker-supported platforms" and removed the over-specific Linux/Mac claim.
- The post said it walks through every `docker volume` command, but the current CLI also includes `docker volume update` for cluster volumes. Updated the claim to "core `docker volume` commands."
- A sentence said the PostgreSQL example mounted a named volume at `/data`, but the command mounts it at `/var/lib/postgresql/data`. Updated the description to match the command.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the snippet follows the current Compose Specification guidance.
- The `docker volume prune` section said `docker volume prune` removes all unused volumes. Current Docker removes unused anonymous volumes by default; `--all` is required to include named volumes. Updated the text, command examples, and quick reference accordingly.
- The label-filtered prune example omitted `--all`, which would not match the surrounding wording for named labeled volumes. Updated it to `docker volume prune --all --filter "label=env=development"`.

## Review Notes
The remaining examples are consistent with current Docker CLI syntax and Docker's official volume backup, restore, read-only mount, NFS volume, Compose volume, and disk usage guidance. The backup examples are technically valid, but database users should still coordinate backups with database-specific consistency mechanisms in production.
