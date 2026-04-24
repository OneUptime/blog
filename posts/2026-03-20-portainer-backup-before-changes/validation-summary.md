# Validation Summary: How to Back Up Portainer Database Before Major Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker volumes
- Docker CLI (`docker run`, `docker pull`, `docker inspect`, `docker volume`)
- GNU tar
- BoltDB / bbolt

## Sources Consulted
- Portainer backup and restore settings: https://docs.portainer.io/admin/settings/general
- Portainer backup contents FAQ: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer rollback FAQ: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer Docker standalone upgrade docs: https://docs.portainer.io/start/upgrade/docker
- Portainer database encryption docs (confirms BoltDB in `portainer_data`): https://docs.portainer.io/advanced/db-encryption
- Docker volumes manual, including backup/restore patterns and read-only mounts: https://docs.docker.com/engine/storage/volumes/
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `docker volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- bbolt backup guidance: https://github.com/etcd-io/bbolt

## Issues Found
- The original quick backup and bulk-operation backup commands copied the Portainer data volume while Portainer was still running. Because Portainer stores configuration in BoltDB, and bbolt documents hot backups via `Tx.WriteTo()` or `Tx.CopyFile()` from a read-only transaction, a raw filesystem tar of a live database is not the documented consistent-hot-backup method. I changed the examples to stop Portainer first, mount the volume read-only, and restart Portainer where the workflow still needs the UI.
- The upgrade example used `$(portainer --version ...)` on the host, which is not a valid way to determine the running Portainer container version in a standard Docker deployment. I replaced this with `docker inspect --format '{{.Config.Image}}' portainer` to capture the current image reference before the change.
- The upgrade example used `portainer/portainer-ce:latest` and a placeholder `docker run` command with `...`. Portainer’s current Docker standalone upgrade documentation uses full commands and the `portainer/portainer-ce:lts` tag for the documented CE LTS upgrade path. I replaced the placeholder commands with the current documented Docker run and pull commands.
- The rollback example used a non-runnable placeholder image tag (`previous-tag`). I changed the workflow to save the current image reference before the change and reuse that saved value during rollback, so the command is executable and aligned with Portainer’s requirement that older Portainer versions must use matching older databases.
- The upgrade backup example originally wrote the archive to the current directory while the restore example mounted `/tmp` into the restore container. I changed the upgrade backup file path to `/tmp` so the restore flow is internally consistent.
- I normalized the tar command examples to standard `tar -czf`, `tar -tzf`, and `tar -xzf` forms and fixed one unquoted shell variable in the size check.

## Review Notes
- Portainer’s official documentation now emphasizes the built-in backup and restore flow in the UI, with restore performed on a fresh instance that has an empty data volume. This post documents a manual Docker-volume backup workflow instead. That workflow is technically defensible because Portainer documents its backup archive as the contents of `/data`, and Docker documents tar-based volume backup and restore patterns, but it is still more manual than Portainer’s primary documented restore path.
- The current Portainer docs at review time show the LTS documentation track (`2.39 LTS`) and separate STS documentation. If an operator wants deterministic rollbacks, pinning an exact image tag is safer than floating tags such as `lts`.
- The local workspace did not have the Docker CLI installed, so Docker command syntax was validated against Docker’s official CLI and storage documentation rather than local `--help` output.
