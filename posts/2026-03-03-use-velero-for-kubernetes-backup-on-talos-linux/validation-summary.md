# Validation Summary: How to Use Velero for Kubernetes Backup on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Velero
- Velero node agent and File System Backup
- Velero CSI snapshot support
- AWS S3
- MinIO
- Prometheus ServiceMonitor

## Sources Consulted
- Velero v1.18 Install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 upgrade documentation: https://velero.io/docs/v1.18/upgrade-to-1.18/
- Velero AWS plugin documentation and compatibility notes: https://github.com/velero-io/velero-plugin-for-aws
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 CSI support documentation: https://velero.io/docs/v1.18/csi/
- Velero v1.18 troubleshooting and metrics documentation: https://velero.io/docs/v1.18/troubleshooting/
- Sidero Labs Talos local storage documentation: https://docs.siderolabs.com/kubernetes-guides/csi/local-storage

## Issues Found
- The Velero CLI download and AWS plugin examples used older v1.14-era versions. Updated the CLI download to Velero v1.18.0 and the AWS plugin image to velero/velero-plugin-for-aws:v1.14.0, matching the current Velero v1.18 release line.
- The MinIO Kubernetes manifest referenced a minio-data PVC but did not create it. Added a PersistentVolumeClaim to make the deployment valid.
- The MinIO Velero install used a velero-backups bucket that the setup never created. Added a MinIO client command to create the bucket.
- The CSI section instructed readers to install velero/velero-plugin-for-csi:v0.7.0. Velero v1.14 and newer include CSI support in Velero itself, so the separate plugin should not be installed. Updated the instructions to enable the EnableCSI feature flag only.
- The file system backup heading referenced Restic/Kopia. Current Velero documentation treats Restic as deprecated and uses Kopia for current file system backup workflows, so the heading now says Kopia.
- The full backup example created a date-based backup name but described a hard-coded backup name. Changed the example to store the generated name in BACKUP_NAME and reuse it.
- The restore example checked a restore name that Velero would not necessarily create automatically. Updated the command to create a named restore and then describe/log that same name.
- The ServiceMonitor example used the wrong Velero metrics port name. Updated the port to metrics and the selector to the default deploy: velero label used by Velero metrics examples.
- The Talos-specific node-agent note incorrectly implied the node agent itself needed a custom writable filesystem path. Reworded it to match Velero's default /var/lib/kubelet host paths and Talos guidance for custom hostPath storage under /var.

## Review Notes
- The AWS IAM setup remains abbreviated and uses placeholder credentials. A future improvement would be to include the full least-privilege IAM policy and access-key creation flow from the Velero AWS plugin documentation.
- The in-cluster MinIO example assumes the cluster has a default StorageClass that can satisfy the PersistentVolumeClaim.
