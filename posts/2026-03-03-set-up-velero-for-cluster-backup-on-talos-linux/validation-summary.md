# Validation Summary: How to Set Up Velero for Cluster Backup on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Velero
- Kubernetes
- AWS S3
- MinIO
- CSI volume snapshots
- Prometheus alerting

## Sources Consulted
- Velero v1.18 install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 file system backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 CSI support documentation: https://velero.io/docs/v1.18/csi/
- Velero v1.18 backup reference: https://velero.io/docs/v1.18/backup-reference/
- Velero v1.18 restore reference: https://velero.io/docs/v1.18/restore-reference/
- Velero AWS plugin README and compatibility matrix: https://github.com/velero-io/velero-plugin-for-aws
- Velero and AWS plugin GitHub releases API for current latest versions.
- Talos Linux disaster recovery documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- Kubernetes API conventions for Deployment, Service, Namespace, and PersistentVolumeClaim resources.

## Issues Found
- The Velero Linux download commands used the old `vmware-tanzu/velero` GitHub repository path. Updated the GitHub API and release download URLs to `velero-io/velero`.
- The AWS and MinIO install examples used `velero/velero-plugin-for-aws:v1.9.0`, which is aligned with older Velero releases. Updated the examples to `v1.14.0`, the current AWS plugin release for current Velero.
- The AWS S3 example assumed the backup bucket already existed. Added an explicit `aws s3api create-bucket` step because Velero requires an existing object storage bucket.
- The MinIO manifest referenced a `velero` namespace and `minio-data` PVC without creating them. Added a `Namespace` and `PersistentVolumeClaim` to make the manifest apply cleanly.
- The MinIO section said to create the bucket but did not include commands to deploy MinIO or create the bucket. Added `kubectl apply`, rollout status, and a `minio/mc` bucket creation command.
- The CSI section recommended installing `velero/velero-plugin-for-csi:v0.7.0`. Velero CSI support has been merged into Velero since v1.14, so the standalone CSI plugin is no longer needed. Replaced that instruction with current `--features=EnableCSI` guidance and noted the interaction with `--default-volumes-to-fs-backup`.
- The Talos machine configuration backup command used `talosctl get machineconfig`, which does not match current Talos disaster recovery documentation. Updated it to `talosctl -n <IP> get mc v1alpha1 -o yaml | yq eval '.spec' -`.
- The Talos etcd snapshot command was changed to the documented `talosctl -n <IP> etcd snapshot db.snapshot` form.

## Review Notes
- The Velero CLI was not installed in the local environment, so CLI validation was performed against current official docs and upstream Velero source for flag definitions.
- The guide intentionally uses simple access-key examples for AWS and MinIO; production deployments should use least-privilege credentials, private secrets management, and non-default MinIO credentials.
