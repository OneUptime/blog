# Validation Summary: Best Practices for Backup and Disaster Recovery with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker named volumes
- Restic
- Amazon S3 and S3-compatible object storage
- Bash shell scripting

## Sources Consulted
- Portainer documentation, "Back up Portainer": https://docs.portainer.io/admin/settings/general
- Portainer documentation, "What does Portainer's backup include?": https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Docker documentation, "Volumes": https://docs.docker.com/engine/storage/volumes/
- Docker CLI reference, `docker volume rm`: https://docs.docker.com/reference/cli/docker/volume/rm/
- restic documentation, "Preparing a new repository": https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- restic documentation, "Removing backup snapshots": https://restic.readthedocs.io/en/v0.17.1/060_forget.html

## Issues Found
- The built-in backup section incorrectly described Portainer backup as a Business Edition-only feature and implied scheduled local backups. I corrected it to reflect Portainer's local backup capability and that Business Edition specifically adds S3 storage and scheduled backups.
- The manual volume backup commands archived `/data` directly, which makes restore behavior depend on path stripping. I changed the backup commands to tar the volume contents from inside `/data`, so the resulting archives restore cleanly back into the target volume.
- The Restic retention command omitted all repository and credential environment variables, so `forget --prune` would fail to authenticate. I added the required environment variable passthrough to that container run.
- The Restic initialization note used `restic init` directly even though the example otherwise relied on the `restic/restic` container image. I changed the initialization example to use the same containerized approach.
- The restore runbook tried to remove `portainer_data` while the stopped `portainer` container still referenced it, which Docker does not allow. I replaced that with a helper-container step that clears the existing volume contents before restoring the archive.
- The restore runbook also used unquoted path expansion for `dirname` and `basename`. I fixed the quoting so the script handles backup file paths safely.

## Review Notes
- Portainer's built-in backup restore flow is documented for a fresh Portainer instance with an empty data volume. The post's recovery runbook now clearly represents a separate manual volume-backup restore approach.
- The Restic example now uses an Amazon S3 regional endpoint. For Wasabi, MinIO, Backblaze B2 S3-compatible access, or other providers, the repository URL and endpoint must be adjusted to match that provider's documentation.
