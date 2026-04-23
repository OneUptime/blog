# Validation Summary: How to Restore Portainer from a Backup - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition and Business Edition
- Portainer backup and restore
- Portainer HTTP API
- Docker CLI
- Docker volumes
- tar archives
- curl multipart form uploads

## Sources Consulted
- Portainer documentation: Back up Portainer and restoring from local file or S3 (https://docs.portainer.io/admin/settings/general)
- Portainer documentation: Docker Standalone install for Portainer CE (https://docs.portainer.io/start/install-ce/server/docker/linux)
- Portainer documentation: What Portainer backups include (https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- Portainer documentation: Roll back to a previous version and database compatibility notes (https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer)
- Portainer API documentation landing page (https://docs.portainer.io/api/docs)
- Portainer official source: backup restore handler and multipart `file`/`password` parsing (https://github.com/portainer/portainer/blob/develop/api/http/handler/backup/restore.go)
- Portainer official source: restore rejects already-initialized instances (https://github.com/portainer/portainer/blob/develop/api/http/handler/backup/restore.go)
- Docker CLI reference: `docker run` (https://docs.docker.com/reference/cli/docker/container/run/)
- Docker CLI reference: `docker volume create` (https://docs.docker.com/reference/cli/docker/volume/create/)
- Docker CLI reference: `docker volume rm` (https://docs.docker.com/reference/cli/docker/volume/rm/)
- Docker CLI reference: `docker container rm` (https://docs.docker.com/reference/cli/docker/container/rm/)

## Issues Found
1. **The restart command used the floating `latest` image tag.** Portainer's current Docker install documentation uses release-stream tags rather than `latest`, and restore workflows are sensitive to database/schema compatibility. Changed `portainer/portainer-ce:latest` to `portainer/portainer-ce:sts` to align the example with the current documented install pattern.
2. **The API restore section implied a Business Edition-only restore and did not state the fresh-instance requirement.** Portainer's restore endpoint is public, but the official handler rejects already-initialized instances and the documentation says restores are performed during initial setup on a fresh instance. Renamed the section to "Restore via Portainer API" and clarified that the API restore is for a fresh, uninitialized Portainer instance.
3. **The API restore example always included a password field without explaining when to omit it.** Portainer decrypts only when a password value is provided, so sending a password for an unencrypted backup can fail. Added a note to omit the password field when the backup was not encrypted.

## Review Notes
- Docker is not installed in this workspace, so Docker CLI examples were checked against the official Docker CLI reference rather than local `--help` output.
- For strict rollback scenarios, readers should use the Portainer edition and version that matches the backup or database they are restoring before upgrading further.
- Portainer backups restore Portainer configuration, database records, and Portainer-managed stack files; they do not restore managed containers, Docker volumes, images, or application data.
