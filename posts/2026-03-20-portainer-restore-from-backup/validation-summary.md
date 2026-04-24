# Validation Summary: How to Restore Portainer from a Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Portainer Business Edition
- Docker volumes and `docker run`
- Portainer HTTP API
- Kubernetes (`kubectl`, Pods, PVCs)
- BoltDB / Portainer database files

## Sources Consulted
- Portainer docs, General settings / backup and restore: https://docs.portainer.io/admin/settings/general
- Portainer docs, API documentation landing page: https://docs.portainer.io/api/docs
- Portainer docs, What Portainer's backup includes: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer docs, Roll back to a previous version: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer docs, CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE Kubernetes manifest: https://downloads.portainer.io/ce-lts/portainer.yaml
- Portainer source, restore HTTP handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/backup/restore.go
- Portainer source, backup archive creation: https://raw.githubusercontent.com/portainer/portainer/develop/api/backup/backup.go
- Portainer source, backup restore logic: https://raw.githubusercontent.com/portainer/portainer/develop/api/backup/restore.go
- Portainer source, BoltDB file names and encrypted DB behavior: https://raw.githubusercontent.com/portainer/portainer/develop/api/database/boltdb/db.go
- Docker docs, Volumes / back up, restore, or migrate data volumes: https://docs.docker.com/engine/storage/volumes/
- Docker docs, `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker docs, `docker run`: https://docs.docker.com/engine/containers/run/
- Kubernetes docs, `kubectl scale`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale
- Kubernetes docs, `kubectl wait`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes docs, `kubectl cp`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes docs, Volumes / `emptyDir`: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The post described Portainer native restore as a Business Edition-only flow available from `Settings` after login and uploading a ZIP. I corrected this to the current restore flow on a fresh, uninitialized instance with an empty data volume, and fixed the backup format to Portainer's `tar.gz`-based archive. This matches the current Portainer docs and official backup code.
- The API restore example incorrectly authenticated first and sent a bearer token. I removed the auth flow and kept the restore request as a multipart upload to `/api/restore` on an uninitialized instance. This matches the official Portainer restore handler, which is public and rejects restores after initialization.
- The Kubernetes restore example used the wrong label selector and relied on a ConfigMap to hold the backup archive. I replaced it with a temporary restore Pod that mounts the Portainer PVC, stages the archive via `kubectl cp`, and extracts it into `/data`. This matches the labels in Portainer's official Kubernetes manifest and avoids the size and binary-data limitations of ConfigMaps.
- The database file copy section implied a complete restore. I clarified that it restores only the Portainer database file and not the rest of `/data`, and added the note that encrypted databases use `portainer.edb`. This matches Portainer's backup scope documentation and database implementation.
- The version-mismatch troubleshooting section had the rollback logic backward and used an invalid shell snippet with `--no-analytics`. I replaced it with a valid `docker run` example and corrected the guidance to use the Portainer image version that matches the backup when rolling back. This matches Portainer's official rollback guidance, and `--no-analytics` is deprecated and unrelated to restore correctness.
- The main Docker restore example used `portainer/portainer-ce:latest`. I changed it to `portainer/portainer-ce:lts` to align with current Portainer deployment guidance.

## Review Notes
- Portainer backups restore Portainer configuration and Portainer-managed stack definitions, not the underlying Docker or Kubernetes workloads and not their application data volumes.
- If the Portainer database was encrypted, the restored instance must be started with the same encryption secret/key material used by the original instance.
- Portainer's API documentation currently advertises a JSON restore payload, but the official restore handler implementation accepts a multipart form upload with `file` and optional `password`.
