# Validation Summary: How to Use Workload Migration Between Clusters with Velero Cross-Cluster Restore

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero AWS plugin
- AWS S3
- AWS EBS snapshots
- Velero File System Backup
- Kubernetes YAML manifests
- Bash
- Python

## Sources Consulted
- Velero v1.18 Install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 Cluster Migration documentation: https://velero.io/docs/v1.18/migration-case/
- Velero v1.18 Backup Reference: https://velero.io/docs/v1.18/backup-reference/
- Velero v1.18 Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.18 Restore Resource Modifiers documentation: https://velero.io/docs/v1.18/restore-resource-modifiers/
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18.1 GitHub release: https://github.com/velero-io/velero/releases/tag/v1.18.1
- Velero AWS plugin documentation and compatibility table: https://github.com/velero-io/velero-plugin-for-aws

## Issues Found
- The post used Velero v1.12.0 for a 2026 tutorial, but v1.12 documentation is no longer actively maintained. Updated the CLI download to Velero v1.18.1.
- The AWS plugin image was `velero/velero-plugin-for-aws:v1.8.0`, which is outdated for current Velero. Updated it to `velero/velero-plugin-for-aws:v1.14.0`, the compatible AWS plugin line for Velero v1.18.
- The IAM policy only included S3 permissions while the install enabled volume snapshots. Added the EBS snapshot permissions required by the Velero AWS plugin and added `s3:PutObjectTagging`.
- The post said Velero handles resource transformations broadly. Clarified that Velero can remap namespaces and apply resource modifiers rather than automatically transforming resources for every target environment.
- The resource transformation example incorrectly used restore hooks against Deployments and StatefulSets. Velero restore hooks apply to restored pods; replacing Deployment image fields requires restore resource modifiers. Replaced the example with a valid resource modifier and restore command.
- The persistent-volume migration section used deprecated Restic terminology and flags (`--use-restic`, `--default-volumes-to-restic`). Updated it to Velero File System Backup using `--use-node-agent` and `--default-volumes-to-fs-backup`.
- The validation script counted pods in `Running` phase as ready. Updated the check to count pods with a `Ready=True` condition.

## Review Notes
- The target cluster install uses the same backup storage location configuration as the source. Velero's migration documentation recommends configuring the target BackupStorageLocation as read-only when it is only used for restore, to avoid accidental object-store deletion.
- Backups created in the source cluster may take up to the backup sync interval to appear in the target cluster.
