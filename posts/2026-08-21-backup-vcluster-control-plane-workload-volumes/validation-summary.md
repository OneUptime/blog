# Validation Summary: How to Back Up a vCluster Control Plane and Workload Volumes

## Status

validated

## Post Type

Disaster-recovery guide

## Technologies Covered

- vCluster 0.36 snapshots and restores
- Kubernetes control-plane state, namespaces, PVCs, and CSI volume snapshots
- Velero 1.18 CSI snapshots, CSI Snapshot Data Movement, and file-system backup
- Amazon S3 snapshot storage and SSE-S3 encryption
- Application-consistent backup and disaster-recovery planning

## Sources Consulted

- vCluster 0.36 create snapshots: https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup
- vCluster 0.36 restore snapshots: https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore
- vCluster 0.36 Velero guide: https://www.vcluster.com/docs/vcluster/manage/backup-restore/velero
- vCluster 0.36 snapshot-create CLI reference: https://www.vcluster.com/docs/vcluster/cli/vcluster_snapshot_create
- vCluster 0.36 snapshot-get CLI reference: https://www.vcluster.com/docs/vcluster/cli/vcluster_snapshot_get
- vCluster 0.36 create CLI reference: https://www.vcluster.com/docs/vcluster/cli/vcluster_create
- vCluster 0.35 snapshot-create CLI reference: https://www.vcluster.com/docs/vcluster/0.35.0/cli/vcluster_snapshot_create
- vCluster namespace synchronization: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/namespaces
- vCluster Host Path Mapper compatibility: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/host-path-mapper
- vCluster lifecycle policy and supported releases: https://www.vcluster.com/docs/vcluster/manage/upgrade/supported_versions
- Velero 1.18 documentation index: https://velero.io/docs/v1.18/
- Velero 1.18 CSI snapshot support: https://velero.io/docs/v1.18/csi/
- Velero 1.18 CSI Snapshot Data Movement: https://velero.io/docs/v1.18/csi-snapshot-data-movement/
- Velero 1.18 file-system backup: https://velero.io/docs/v1.18/file-system-backup/
- Velero 1.18 restore reference: https://velero.io/docs/v1.18/restore-reference/
- Velero 1.18 backup hooks: https://velero.io/docs/v1.18/backup-hooks/
- Kubernetes volume snapshot consistency guidance: https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/
- AWS CLI `get-caller-identity`: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- Amazon S3 SSE-S3 guidance: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- NIST recovery point objective definition: https://csrc.nist.gov/glossary/term/recovery_point_objective

## Issues Found

- The text said `vcluster snapshot get` waited for completion, but the command performs a one-time status query. Changed the instruction to tell readers to rerun it until the status is `Completed`.
- The CSI guidance treated the backup target as though a native CSI snapshot's volume bytes were copied there. Clarified that native snapshots require a durable provider snapshot accessible to the recovery cluster and that portable object-storage recovery requires CSI Snapshot Data Movement with `--snapshot-move-data`.
- The file-system backup guidance did not state that Velero can back up only volumes mounted by Pods. Added that limitation and directed unmounted PVCs to another backup method.
- The namespace-scoped Velero example was presented like a workload-only backup even though it is a whole-namespace backup that can overlap with vCluster configuration, state, and control-plane storage. Renamed the example artifact and documented its actual scope.
- The restore procedure restored the vCluster snapshot before the namespace-wide Velero artifact. That can recreate PVCs before Velero runs; Velero skips existing resources by default, and its update policy does not restore PV data into an existing PVC. Changed the procedure so a host-level namespace restore runs against an empty, identical target topology before the paired vCluster snapshot, while provider or application backups that support existing volumes retain their tool-specific ordering. Added a write fence so workloads cannot mutate restored volumes before the control-plane snapshot and coordinated external state are restored, moved external-state restoration ahead of application validation, and prohibited overlaying artifacts from incompatible recovery points.
- The post described RPO and RTO themselves as measured recovery results. Changed this to measure effective recovery-point age and actual recovery duration, then compare those results with the documented objectives.
- The Velero links targeted the unstable `main` documentation. Pinned them to the current stable v1.18 documentation and added the data-movement and restore references needed by the corrected guidance.

## Review Notes

- vCluster 0.36 is the stable, supported release on the validation date. Its stable backup guide says snapshots do not back up persistent volumes. The older `--include-volumes` workflow was deprecated in v0.35 and is absent from the v0.36 snapshot-create command.
- vCluster snapshots also exclude cluster certificates and require a running, non-sleeping tenant cluster. The post does not claim otherwise, but recovery runbooks should account for those limitations.
- Running file-system backup inside a tenant vCluster requires the HostPath Mapper workflow; vCluster 0.36 documents HostPathMapper v0.2.3 and later as incompatible with `sync.toHost.namespaces`. The post's corrected example remains a host-level workflow.
- All displayed AWS, vCluster, and Velero command names, arguments, and flags were verified as current for the versions discussed.
