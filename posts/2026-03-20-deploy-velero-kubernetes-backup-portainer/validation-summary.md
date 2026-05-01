# Validation Summary: How to Deploy Velero for Kubernetes Backup via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Velero
- Kubernetes
- AWS S3
- AWS EBS snapshots

## Sources Consulted
- Velero Basic Install: https://velero.io/docs/main/basic-install/
- Velero Install CLI: https://velero.io/docs/v1.18/velero-install/
- Velero AWS plugin README and compatibility matrix: https://github.com/velero-io/velero-plugin-for-aws
- Velero File System Backup: https://velero.io/docs/main/file-system-backup/
- Velero CSI support: https://velero.io/docs/main/csi/
- Velero Backup API Type: https://velero.io/docs/v1.11/api-types/backup/
- Velero Schedule API Type: https://velero.io/docs/v1.17/api-types/schedule/
- Portainer add a new application using code: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer create an application from a manifest: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer namespaces: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces
- Portainer custom resources: https://docs.portainer.io/sts/user/kubernetes/more-resources/custom-resources

## Issues Found
- The Linux Velero CLI install snippet was broken. The `latest/download/velero-linux-amd64.tar.gz` asset name was not valid for current releases, and the extracted binary path was wrong. I replaced it with a versioned release download and the correct extracted binary path.
- The post described generic "S3-compatible" storage, but the install example used the AWS plugin without the extra endpoint settings required by non-AWS S3-compatible providers. I narrowed the prerequisite text to AWS S3 so it matches the actual command shown.
- The AWS plugin version `v1.9.0` was outdated for current Velero `v1.17.x` usage. I updated it to `velero/velero-plugin-for-aws:v1.13.1`, which matches the current compatibility line for Velero `v1.17.x`.
- The architecture section implied CSI snapshotting, but the example install command is the AWS plugin workflow. I changed the diagram to AWS EBS snapshots so it matches the rest of the guide.
- The Portainer navigation path `Kubernetes > Advanced Deployment` was outdated. I updated it to the current manifest workflow: `Applications > Create from code > Manifest`.
- The restore example created an unnamed restore, then described a fixed restore name that would not exist. I changed the command to create `full-cluster-backup-restore` explicitly before describing it.
- The command `velero backup get --all-namespaces` was invalid in current Velero CLI help. I corrected it to `velero backup get`.
- The introductory and summary wording overstated snapshot behavior. I changed "scheduled snapshots" to "scheduled backups" and clarified that persistent volume data protection depends on supported snapshots or file-system backup.

## Review Notes
- This guide is now technically consistent as an AWS plugin example. If it is later expanded back to generic S3-compatible storage, it will need additional `BackupStorageLocation` endpoint settings such as `s3Url` and `s3ForcePathStyle`, and snapshot guidance may differ by storage provider.
- Portainer's custom resource inspection is edition- and role-dependent in current docs, so the CLI remains the most portable verification path.
