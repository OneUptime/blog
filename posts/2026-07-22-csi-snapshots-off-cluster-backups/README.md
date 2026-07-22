# Are CSI Volume Snapshots Backups? Designing for Off-Cluster Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, Backup, Disaster Recovery, Velero

Description: Turn fast CSI snapshots into a disaster-recovery design that survives cluster, account, region, and storage failures.

---

A CSI volume snapshot can be one layer of a backup strategy, but a snapshot left on the source storage system is not sufficient disaster recovery. It often shares the provider account, region, control plane, encryption keys, credentials, and failure modes of the original volume. It also does not automatically capture Kubernetes workload objects or make database data application-consistent.

Use local CSI snapshots for fast recovery, then move or copy protected data and its metadata into an independently administered failure domain. The design is complete only after a clean-room restore proves that both can be reconstructed.

## What Kubernetes Guarantees

The Kubernetes snapshot API gives a standard workflow for CSI drivers:

- a namespaced `VolumeSnapshot` requests or represents a point-in-time copy;
- a cluster-scoped `VolumeSnapshotContent` binds to it one-to-one;
- a `VolumeSnapshotClass` selects a driver, deletion policy, and driver-specific parameters;
- a ready snapshot can populate a **new** PVC through `spec.dataSource`.

The external snapshotter calls the CSI driver's `CreateSnapshot` and `DeleteSnapshot` operations. The storage provider decides how bytes are represented: full copy, copy-on-write, incremental chain, native cloud snapshot, or another implementation.

`status.readyToUse: true` means the driver reports that the snapshot can be used to create a volume. It does not certify application consistency, geographic independence, integrity, malware cleanliness, or a successful restore.

## Test the Failure Domains

Ask whether the recovery point remains usable after each event:

| Failure | Local CSI snapshot alone |
| --- | --- |
| Accidental file deletion | Often useful |
| Bad deployment or volume corruption | Often useful if captured earlier |
| Namespace deletion | Depends on content deletion policy and controller behavior |
| Cluster loss | Provider snapshot may survive, but Kubernetes metadata is gone |
| Storage account or project compromise | Often exposed to the same attacker |
| Region or storage-array failure | Provider-specific; frequently not sufficient |
| Encryption-key deletion | Snapshot can become unreadable |
| Database inconsistency | Snapshot may restore but fail application recovery |

This is why “the snapshot is in another object” is not the same as “the backup is in another failure domain.” A provider snapshot handle is a reference, not portable backup data.

## Build a Layered Recovery System

A practical design uses complementary tiers.

### Tier 1: Fast Local Recovery

Create CSI snapshots frequently for rollback and operational recovery. Keep them near the workload so new volumes can be provisioned quickly. Use a short, enforced lifecycle and monitor every snapshot until it becomes ready.

Choose `VolumeSnapshotContent` deletion policy deliberately. `Delete` is suitable when automation owns the snapshot lifetime. `Retain` lets the content and provider snapshot survive deletion of the namespaced object, but creates a manual reclamation responsibility. Neither policy moves the data.

### Tier 2: Independent Backup Storage

Move snapshot contents or perform a file-level backup to object storage in another account, project, region, or administrative boundary. Protect that storage with least-privilege credentials, encryption keys independent from the source data path, versioning or object lock where supported, and monitored lifecycle rules.

Velero CSI Snapshot Data Movement is one official option. It creates a CSI snapshot, provisions temporary access to it, and uses a data mover to upload the data to a configured backup repository. After movement, Velero removes the temporary CSI snapshot. On restore, it downloads into a newly provisioned PVC. This hybrid keeps the point-in-time advantage of a storage snapshot while producing a more portable copy.

Velero's File System Backup is another option when the CSI driver lacks snapshot support or storage portability is more important than block-level speed. It reads a live mounted volume, so it is generally less point-in-time consistent and requires application quiescing for stateful data.

### Tier 3: Application-Native Recovery

For important databases, retain logical dumps, physical database backups, and continuous logs such as PostgreSQL WAL or MySQL binary logs according to vendor guidance. These support granular validation and point-in-time recovery that one volume snapshot cannot provide.

Application-native backups also protect against a storage snapshot that is structurally intact but semantically unusable. They should not necessarily replace fast volume recovery; the two methods cover different failure modes.

## Protect the Kubernetes Metadata

Data blocks alone do not reconstruct a workload. Back up or declaratively manage:

- Deployments, StatefulSets, Services, Jobs, and custom resources;
- PVC specifications and their mapping to workload volume names;
- StorageClass and VolumeSnapshotClass intent, without assuming a target cluster can use the same implementation;
- ConfigMaps and the references to Secrets;
- CRDs and operator versions required to interpret custom resources;
- RBAC, network policy, disruption policy, and scheduling constraints;
- database version, restore commands, and bootstrap ordering.

Treat secret values and encryption keys separately. A backup encrypted with a key that exists only in the failed cluster is not recoverable. Conversely, copying every credential into the same backup bucket broadens compromise. Design key escrow and break-glass access explicitly.

GitOps can recreate manifests, but it does not preserve dynamically generated state such as PVC-to-PV bindings, operator status, or secret material unless those are managed elsewhere. Document which system is authoritative for every item.

## Make the Snapshot Recoverable

Before calling a snapshot a recovery point, verify:

1. The source PVC is bound to the intended CSI volume.
2. The snapshot and content are bound to each other.
3. `readyToUse` is true and the provider handle exists.
4. Every required data, journal, WAL, tablespace, and configuration volume is included.
5. The workload was quiesced or the database's crash-recovery assumptions are documented.
6. Multi-volume data was captured with a supported group snapshot or a full application pause.
7. The independent copy completed and its repository is healthy.
8. Required object metadata and encryption keys are protected.

Do not equate snapshot creation latency with backup completion. Data movement can continue for hours after the provider snapshot is ready, and a retention job must not delete its input early.

## Separate Access and Deletion Authority

An attacker who can delete production volumes should not automatically be able to delete every recovery copy. Use a separate cloud account or project, separate credentials, and write-focused backup roles where the platform supports them. Restrict Kubernetes permission to delete `VolumeSnapshot` and especially cluster-scoped `VolumeSnapshotContent` objects.

Align all lifecycle layers:

- snapshot content deletion policy;
- Velero backup TTL;
- provider snapshot archive or recycle policy;
- object-storage retention and immutability;
- encryption-key retention;
- legal holds.

Conflicting rules produce either surprise deletion or indefinite cost. Maintain an inventory that joins the Kubernetes content name, provider handle, backup ID, repository object, owner, and expiry.

## Design From RPO and RTO

Suppose the requirement is a 15-minute RPO, a one-hour RTO for common incidents, and survival of regional loss. One possible policy is:

- CSI snapshots every 15 minutes, retained locally for 24 hours;
- hourly snapshot data movement to another region, retained for 30 days;
- daily application-native backup plus continuous transaction logs;
- monthly recovery copy under longer immutable retention.

The tiers are illustrative, not universal. Measure snapshot duration, data-movement throughput, provider quotas, restore provisioning time, filesystem recovery, and database replay. If moving a 10 TiB snapshot takes six hours, an hourly schedule does not create an hourly portable recovery point without incremental behavior and sufficient throughput.

## Prove Recovery Outside the Source Cluster

Run scheduled restore drills into an isolated target cluster that does not depend on the source control plane. The target needs compatible APIs, a working StorageClass, required CSI or data-mover components, and access to the backup repository and keys.

During each drill:

- restore resources in the correct dependency order;
- keep external side effects such as email and payments disabled;
- wait for PVCs and application recovery, not only object creation;
- check database-native integrity and expected records;
- compare representative file hashes or object counts;
- record the newest recoverable timestamp and total recovery time;
- delete the drill through the same controlled cleanup path used in production.

A local snapshot is valuable because it is fast and storage-native. An independent backup is valuable because it survives the source's fate. A resilient system deliberately keeps both.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes and Deletion Policy](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes CSI Developer Documentation: Snapshot and Restore](https://kubernetes-csi.github.io/docs/snapshot-restore-feature)
- [Velero: CSI Snapshot Data Movement](https://velero.io/docs/main/csi-snapshot-data-movement/)
- [Velero 1.18: File System Backup](https://velero.io/docs/v1.18/file-system-backup)
- [Velero 1.18: Restore Reference](https://velero.io/docs/v1.18/restore-reference/)
