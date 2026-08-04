# Validation Summary: Move Stateful Kubernetes Workloads Between Clouds Safely

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes StatefulSets
- PersistentVolumes and PersistentVolumeClaims
- Container Storage Interface (CSI) drivers and volume snapshots
- Kubernetes StorageClasses and reclaim policies
- `kubectl`
- Helm-style values overlays and Kubernetes operators
- PostgreSQL backup, logical replication, replication slots, sequences, and large objects
- Change data capture (CDC) and cross-cloud data migration
- AWS DataSync
- Google Cloud Storage Transfer Service
- Disaster recovery, RPO, RTO, and migration cutover practices

## Sources Consulted

- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes CSI external-snapshotter CRDs](https://github.com/kubernetes-csi/external-snapshotter/tree/master/client/config/crd)
- [Kubernetes VolumeSnapshotContent v1 CRD schema](https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml)
- [Kubernetes VolumeSnapshot v1 CRD schema](https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml)
- [Kubernetes Volume Snapshot GA announcement and application-consistency guidance](https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/)
- [PostgreSQL 18 backup and restore](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL 18 logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL 18 logical replication subscriptions and replication-slot management](https://www.postgresql.org/docs/current/logical-replication-subscription.html)
- [PostgreSQL 18 logical decoding and replication-slot behavior](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html)
- [AWS DataSync documentation](https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html)
- [Google Cloud Storage Transfer Service overview](https://cloud.google.com/storage-transfer/docs/overview)
- [AWS Well-Architected disaster recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/disaster-recovery-dr-objectives.html)
- [NIST Recovery Point Objective glossary entry](https://csrc.nist.gov/glossary/term/recovery_point_objective)
- [NIST Recovery Time Objective glossary entry](https://csrc.nist.gov/glossary/term/recovery_time_objective)

## Issues Found

- The restore-values example used plausible but nonstandard keys without saying that Helm values and operator settings are chart-specific. Added a clarification that the selected chart templates or operator configuration must consume and enforce every setting; otherwise values such as `jobs.enabled` or `migrationMode` have no effect by themselves.
- The rehearsal section labeled two observed time intervals directly as RPO and RTO. RPO and RTO are objectives defined by the organization, not measurements created by a rehearsal. Changed the formulas to name the achieved recovery-point age and observed service interruption, and instructed readers to compare those results with the defined RPO and RTO.

## Review Notes

- The `kubectl get` commands, `-A` flag, and custom-column paths match the current Kubernetes CLI and API fields.
- The `VolumeSnapshot` manifest uses the stable `snapshot.storage.k8s.io/v1` API and valid fields. The named `VolumeSnapshotClass` and PVC are environment-specific prerequisites, and snapshot support still depends on installed CRDs, the snapshot controller, and a CSI driver that implements snapshots.
- The discussion of `VolumeSnapshotContent` driver and snapshot handles, `readyToUse`, deletion policy, and PersistentVolume `Retain` behavior matches the current CSI CRDs and Kubernetes documentation.
- PostgreSQL 18 continues to document that built-in logical replication does not replicate schema DDL, sequence state, or large objects, and that stalled or orphaned replication slots can retain WAL until storage fills.
- All links in the post resolved to the intended official or authoritative resources during review.
