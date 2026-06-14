# Validation Summary: How to Set Up Velero for Kubernetes Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero AWS plugin
- Velero CSI snapshot support
- AWS S3 and S3-compatible object storage
- Kubernetes VolumeSnapshotClass
- Prometheus Operator ServiceMonitor
- Prometheus metrics

## Sources Consulted
- Velero v1.18 Basic Install documentation: https://velero.io/docs/v1.18/basic-install/
- Velero v1.18 Install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 CSI snapshot support documentation: https://velero.io/docs/v1.18/csi/
- Velero v1.18 Backup Hooks documentation: https://velero.io/docs/v1.18/backup-hooks/
- Velero v1.18 Backup Reference documentation: https://velero.io/docs/v1.18/backup-reference/
- Velero Restore Reference documentation: https://velero.io/docs/main/restore-reference/
- Velero Troubleshooting documentation: https://velero.io/docs/v1.18/troubleshooting/
- Velero GitHub releases: https://github.com/velero-io/velero/releases
- Velero AWS plugin repository and releases: https://github.com/velero-io/velero-plugin-for-aws
- Velero metrics source definitions: https://github.com/vmware-tanzu/velero/blob/main/pkg/metrics/metrics.go
- Kubernetes Deployment API requirements: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post used Velero v1.13.0 and AWS plugin v1.9.0 even though newer Velero v1.18.1 and AWS plugin v1.14.1 releases are current. Updated the CLI download and AWS plugin image tags.
- The prerequisites described Google Cloud Storage and Azure Blob as S3-compatible storage. Updated the wording to object storage because those providers use their own Velero plugins rather than the AWS S3-compatible configuration shown later.
- The post implied CRDs are always captured with namespace-scoped backups. Clarified that custom resource instances are captured in the selected scope and CRDs are captured when cluster-scoped resources are included.
- The CSI section installed `velero-plugin-for-csi`, but Velero v1.14 and later include CSI snapshot support in Velero itself. Removed the CSI plugin image and clarified that `--features=EnableCSI` is still required.
- The PVC example used `backup.velero.io/backup-volumes`, which is for filesystem pod-volume backups, not CSI snapshots, and placed it on a PVC. Replaced it with the CSI PVC annotation `velero.io/csi-volumesnapshot-class` for selecting a specific `VolumeSnapshotClass`.
- The troubleshooting section told readers to verify that the CSI plugin is installed. Updated it to verify that Velero was started with CSI support and that a `VolumeSnapshotClass` exists.
- The Deployment manifest for hook annotations was invalid because it lacked a required `spec.selector` and matching pod-template labels. Added the required selector and labels.
- The PostgreSQL hook example stopped and restarted the database process from inside the main container, which can terminate the pod before the post hook runs. Replaced it with a checkpoint pre hook and harmless post-hook logging.
- The monitoring section described `velero_backup_total` as total backup attempts. In Velero metrics, backup attempts are exposed as `velero_backup_attempt_total`; updated the metric name.

## Review Notes
The guide is technically relevant and valid after the corrections. The ServiceMonitor example may still need label or namespace adjustments depending on whether Velero is installed with the CLI, Helm chart, or an operator-managed distribution.
