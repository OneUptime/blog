# Validation Summary: How to Back Up Portainer Data Before an Upgrade - Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Kubernetes
- Bash
- curl
- AWS CLI
- rclone

## Sources Consulted
- Portainer backup settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer backup contents FAQ: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer database encryption documentation: https://docs.portainer.io/advanced/db-encryption
- Portainer Kubernetes installation documentation: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Portainer backup route implementation: https://github.com/portainer/portainer/blob/develop/api/http/handler/backup/handler.go
- Portainer backup handler implementation: https://github.com/portainer/portainer/blob/develop/api/http/handler/backup/backup.go
- Portainer backup archive implementation: https://github.com/portainer/portainer/blob/develop/api/backup/backup.go
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- curl CLI help output: `curl --help all`

## Issues Found
- The post described `portainer_data` as the universal Portainer storage location. I corrected this to explain that Portainer stores data under `/data`, typically in the Docker `portainer_data` volume or a Kubernetes PVC, because the original wording was Docker-specific while the post also covers Kubernetes.
- The Portainer data-location note implied everything relevant lived only in `portainer.db`. I corrected this to state that `portainer.db` is the primary BoltDB database and that additional Portainer-managed files also live elsewhere under `/data`, matching the official backup documentation and upstream source.
- The direct database-copy method was presented as a general backup method without clarifying scope. I marked it as database-only and noted that it excludes other `/data` files such as stack files and certificates, because Portainer backups include more than just `portainer.db`.
- The built-in backup section incorrectly said the feature was Business Edition only and that it downloaded a ZIP file. I corrected this to note that the local download backup is available in Portainer generally, while S3 backup features are BE-only, and that the download is a `tar.gz` archive rather than a ZIP.
- The built-in backup contents list was incomplete. I updated it to mention stack files and Portainer-managed configuration files in addition to the database and certificates, reflecting the official backup documentation and upstream backup implementation.
- The API backup example saved the response as `.zip`. I changed it to `curl -OJ` so the server-provided filename and format are preserved, which aligns with Portainer returning a `tar.gz` backup and an `.encrypted` suffix when password protection is enabled.
- The Kubernetes backup method used a Job with an `emptyDir` as the destination, which is ephemeral and disappears with the pod, so it was not a durable backup. I replaced this with a PVC snapshot example using `VolumeSnapshot`, which is the Kubernetes-native way to snapshot a PVC when supported by the storage driver.
- The automated backup script had broken quoted globs in the retention and listing commands, so wildcard expansion would not occur. I fixed the glob placement so the cleanup and listing commands work correctly.
- The automated backup script created a live tar backup without stopping Portainer, despite the earlier methods recommending a clean backup. I updated the script to stop Portainer before the archive is created and restart it afterward so the script produces a consistent pre-upgrade backup.
- The verification and offsite-upload examples referenced filenames that did not match the archive naming pattern created earlier in the post. I corrected those examples to use an explicit `BACKUP_FILE` variable with the same `portainer-backup-...tar.gz` naming convention.

## Review Notes
- If Portainer database encryption is enabled, restoring the database also requires the same external secret used for `/run/secrets/portainer`; the encrypted database file alone is not sufficient.
- The Kubernetes PVC snapshot example depends on CSI `VolumeSnapshot` support. On clusters without snapshot support, the built-in Portainer backup from Method 3 or storage-platform-specific backup tooling is the safer approach.
