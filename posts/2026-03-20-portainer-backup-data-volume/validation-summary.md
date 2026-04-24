# Validation Summary: How to Back Up Portainer Data Volume - Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker volumes
- Portainer HTTP API
- Bash
- `curl`
- `jq`
- `tar`
- `cron`
- `rsync`
- AWS CLI S3
- OpenSSH `sftp`

## Sources Consulted
- Portainer documentation: What does Portainer's backup include? https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer documentation: General settings (backup and restore) https://docs.portainer.io/admin/settings/general
- Portainer documentation: API documentation landing page https://docs.portainer.io/api/docs
- Portainer CE API spec 2.39.1 https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE API spec 2.39.1 https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer installation docs showing `9443` as the default HTTPS port and `9000` as legacy HTTP https://docs.portainer.io/sts/start/install/server/docker/linux
- Docker documentation: Back up, restore, or migrate data volumes https://docs.docker.com/engine/storage/volumes/
- bbolt README (official project documentation) https://github.com/etcd-io/bbolt
- AWS CLI `s3 sync` command reference https://docs.aws.amazon.com/en_us/cli/latest/reference/s3/sync.html

## Issues Found
- The API examples used `http://localhost:9000`, which Portainer documents as legacy HTTP. I updated them to `https://localhost:9443` and added `curl -k` so the examples work against the default self-signed TLS configuration on current Portainer installs.
- Step 2 said an online tar backup was generally safe because BoltDB uses MVCC. That overclaimed consistency for a raw filesystem copy of a live Portainer data volume. I corrected the text to label it as a best-effort copy and point readers to Portainer's built-in backup API for consistent live backups.
- Step 4 incorrectly said the built-in backup endpoint was Business Edition-only. The current CE and BE API specs both expose `/api/backup`, so I removed the edition restriction.
- The automated backup script could leave Portainer stopped if the backup command failed after `docker stop`. I added an `EXIT` trap that restarts Portainer when needed.
- The manual backup snippet defined `BACKUP_FILE` but did not use it, so the generated filename could drift from the variable if timestamps changed between commands. I updated the tar command to use the defined variable.

## Review Notes
- Portainer's own backup already includes the Portainer database and stack files deployed through Portainer. The separate stack export step is still useful as a human-readable secondary export.
- Portainer documents restore as a fresh-instance operation with an empty data volume. This post focuses on backup only, so I did not expand it into restore instructions.
- The `curl -k` examples are appropriate for Portainer's default self-signed certificate on `9443`. If the instance uses a trusted certificate, `-k` should be removed.
