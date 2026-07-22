# Validation Summary: How to Schedule CSI Volume Snapshots and Enforce Retention in Kubernetes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes CSI volume snapshots
- `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`
- Velero 1.18 schedules, CSI integration, and CSI snapshot data movement
- Velero `DataUpload` resources and backup repositories
- Kubernetes CronJobs and RBAC
- Backup retention, garbage collection, and object-storage lifecycle controls
- Velero backup hooks and application quiescing
- CSI volume group snapshots
- Backup monitoring and restore testing

## Sources Consulted

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes: `kubectl wait`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes API: CronJob v1](https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/)
- [Kubernetes 1.36: Volume Group Snapshots GA](https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/)
- [Kubernetes CSI Developer Documentation: external-snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Velero 1.18: Schedule API](https://velero.io/docs/v1.18/api-types/schedule/)
- [Velero 1.18: Backup Reference](https://velero.io/docs/v1.18/backup-reference/)
- [Velero 1.18: How Velero Works](https://velero.io/docs/v1.18/how-velero-works/)
- [Velero 1.18: CSI Support](https://velero.io/docs/v1.18/csi/)
- [Velero 1.18: CSI Snapshot Data Movement](https://velero.io/docs/v1.18/csi-snapshot-data-movement/)
- [Velero 1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)
- [Velero 1.18: Repository Maintenance](https://velero.io/docs/v1.18/repository-maintenance/)
- [Velero release-1.18 source and CLI definitions](https://github.com/vmware-tanzu/velero/tree/release-1.18)

## Issues Found

- The volume group snapshot guidance could be read as treating group snapshots as a substitute for application quiescing. CSI volume group snapshots provide a crash-consistent, common point in time across supported volumes, but they do not by themselves provide application consistency. The text now states this distinction and includes the required group-snapshot CRDs/controllers, backup-controller support, and CSI-driver support among the prerequisites.

## Review Notes

- Both YAML examples are syntactically valid. The Velero Schedule fields `schedule`, `useOwnerReferencesInBackup`, `includedNamespaces`, `snapshotVolumes`, `snapshotMoveData`, `storageLocation`, and `ttl` are valid in Velero 1.18.
- The `kubectl wait` JSONPath form and the Velero `backup create --from-schedule --wait`, `backup describe --details`, and `backup logs` commands are valid.
- The explanation of Velero TTL, asynchronous garbage collection, CSI snapshot cleanup, repository maintenance, and object-storage immutability limitations matches the Velero 1.18 documentation.
- CSI volume group snapshots reached GA in Kubernetes 1.36 with `groupsnapshot.storage.k8s.io/v1`. Earlier Kubernetes releases use different maturity levels and API versions, so the installed CRDs, controllers, Velero version, and CSI driver must be compatible.
- Every external link in the post returned a successful HTTP response during validation.
