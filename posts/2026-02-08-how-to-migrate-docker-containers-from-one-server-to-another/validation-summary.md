# Validation Summary: How to Migrate Docker Containers from One Server to Another

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker images
- Docker containers
- Docker volumes
- Docker networks
- Docker Compose
- Bash scripting
- SSH, SCP, and rsync

## Sources Consulted
- Docker CLI reference: docker image save - https://docs.docker.com/reference/cli/docker/image/save/
- Docker CLI reference: docker image load - https://docs.docker.com/reference/cli/docker/image/load/
- Docker CLI reference: docker container export - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Engine storage documentation: Volumes, including backup, restore, and migration - https://docs.docker.com/engine/storage/volumes/
- Docker CLI reference: docker volume create - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker CLI reference: docker compose - https://docs.docker.com/reference/cli/docker/compose/
- Docker CLI reference: docker compose up - https://docs.docker.com/reference/cli/docker/compose/up/
- Local Docker CLI help output from Docker 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The export/import section described `docker export` as capturing the container filesystem without noting that mounted volume contents are excluded. Updated the explanation to say it captures the writable filesystem layer and does not include mounted volume data, matching Docker's official `docker container export` documentation.
- The container configuration section said the generated scripts could recreate containers "exactly." The script captures useful common runtime settings, but not every Docker option or all metadata. Updated the wording to avoid overstating the fidelity of the generated `docker run` commands.
- The full migration script used `DEST_SERVER="$1"` while `set -u` was enabled, which would fail with an unbound variable before showing the intended usage message. Changed it to `DEST_SERVER="${1:-}"`.
- The full migration script archived volumes before stopping containers, which could create inconsistent backups for stateful workloads. Reordered the steps so containers are stopped before volume archives are created.
- The full migration script could call `docker stop` with no container IDs if no containers were running. Added a guard around the fallback `docker stop` command.
- The full migration script copied the Compose file to `/opt/app/` without ensuring that directory exists on the destination. Added a remote `mkdir -p /opt/app` before the rsync.

## Review Notes
The Docker CLI commands and flags used in the examples are current and valid. The generated configuration export script is intentionally approximate; using Docker Compose or a maintained deployment manifest remains the better long-term source of truth for recreating containers.
