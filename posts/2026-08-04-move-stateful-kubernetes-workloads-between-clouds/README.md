# Move Stateful Kubernetes Workloads Between Clouds Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Stateful Workloads, Data Migration, Persistent Volumes, CSI, Disaster Recovery, Cloud Portability

Description: Move stateful Kubernetes workloads across providers with application-consistent backups, target-side restores, verified cutover, and an explicit rollback boundary.

---

Kubernetes can recreate a StatefulSet in another cluster. It cannot move the bytes behind a cloud disk merely by exporting YAML. PersistentVolume objects and CSI snapshot handles refer to storage systems outside the Kubernetes API.

A safe move treats compute configuration and data migration as separate workstreams, then reunites them in a rehearsed cutover.

## Choose the Data Path First

Pick a migration mechanism based on the workload's consistency model and outage budget:

| Method | Typical outage | Best fit | Main risk |
| --- | --- | --- | --- |
| Offline application backup and restore | Longest | Smaller datasets, simple rollback | Restore duration exceeds window |
| Initial copy plus incremental file sync | Medium | File repositories with controlled writers | Filesystem copy is not transaction-consistent |
| Database-native replication or CDC | Short | Supported databases with continuous writes | DDL, sequences, unsupported types, and lag |
| Storage-vendor replication/export | Varies | Same storage technology in both environments | Reintroduces a vendor or network dependency |

Kubernetes CSI snapshots are useful for fast, provider-local recovery. The `VolumeSnapshotContent` contains a CSI driver and a backend `snapshotHandle`; do not assume another provider's driver can consume it.

For databases, prefer database-native logical backup, physical backup, or documented replication. For general files, use a copy tool that preserves the metadata the application needs and produces verifiable checksums.

## Inventory State Beyond PVCs

List every claim and connect it to an owner and consistency group:

```bash
kubectl get pvc -A -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.storageClassName,SIZE:.spec.resources.requests.storage,MODE:.spec.volumeMode'
kubectl get pv -o custom-columns='NAME:.metadata.name,DRIVER:.spec.csi.driver,HANDLE:.spec.csi.volumeHandle,RECLAIM:.spec.persistentVolumeReclaimPolicy'
```

Then find state outside Kubernetes:

- managed databases, caches, object stores, and message brokers;
- DNS zones, certificate authority state, and secrets;
- external identities and key-management permissions;
- StatefulSet ordinals and stable network identities;
- scheduled jobs that mutate data;
- uploads staged on local or ephemeral disks;
- backups whose encryption keys exist only in the source cloud.

Classify each item as regenerated, copied, replicated, or intentionally abandoned.

## Build the Target Before Copying Data

Create the destination cluster and validate its foundations:

1. choose a Kubernetes minor version supported by both manifests and add-ons;
2. install CRDs and controllers in dependency order;
3. map intent-based StorageClasses to the target CSI drivers;
4. configure workload identity and key access;
5. mirror container images into a reachable registry;
6. install telemetry without depending on the source environment;
7. reserve quota and verify zonal capacity.

Render workloads with replicas or writers disabled. A database operator or application must not initialize an empty target and accept production traffic before restore completes.

Use a restore-specific overlay rather than editing production manifests by hand:

```yaml
# restore-values.yaml
replicaCount: 0
jobs:
  enabled: false
externalTraffic:
  enabled: false
migrationMode: restore
```

## Establish an Application-Consistent Recovery Point

A crash-consistent disk snapshot captures blocks at one instant but may not represent a clean transaction boundary across several volumes. Quiesce the application or use its backup API.

A generic offline sequence is:

```text
stop new writes
drain in-flight work
flush/checkpoint application state
record recovery-point identifier and time
take backup or export
resume source if this is a rehearsal
```

For a database, record the engine version, extensions, collation, encoding, roles, grants, schemas, sequences, and replication position. For files, record ownership, modes, extended attributes, symlinks, sparse-file requirements, and checksums. Not every destination storage service preserves every filesystem feature.

Encrypt the backup independently of its transport and prove the target team can decrypt it. A portable backup without a portable key is not recoverable.

## Seed and Catch Up

For a low-downtime move, take an initial consistent copy while the source remains authoritative, then stream changes. Monitor lag in time and bytes, along with retained source logs. Replication slots or change logs can consume source storage if the target stalls.

Never introduce dual writes casually. Writing independently to both databases creates partial-success and ordering problems that an ordinary transaction cannot solve across clouds. Prefer one authoritative writer with CDC to the target. If dual writes are unavoidable, use durable operation IDs, an outbox, idempotent consumers, reconciliation, and a documented conflict owner.

Apply schema changes in an order compatible with both sides during replication. PostgreSQL logical replication, for example, does not replicate schema DDL or sequence state, and large objects are outside its normal table replication path.

## Restore into New Target Volumes

Create fresh PVCs through target StorageClasses. Restore into those claims or let the database operator create target storage, rather than copying source PersistentVolume YAML.

For a provider-local rehearsal, a CSI snapshot request may look like:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ledger-rehearsal
  namespace: payments
spec:
  volumeSnapshotClassName: provider-snapshot-retain
  source:
    persistentVolumeClaimName: ledger-data
```

Wait for `status.readyToUse: true` and inspect errors. For the cross-cloud move, export or replicate the application data and write it to a target PVC. Keep the snapshot only as an additional source-side recovery point when its retention and deletion policy are understood.

## Validate Data and Behavior

Validation must go beyond a Pod reaching `Ready`:

- compare row counts by table or partition;
- compare deterministic aggregates and sampled record hashes;
- verify object or file manifests with content checksums;
- test primary keys, sequences, and new writes;
- run application contract and authorization tests;
- execute backup and target-side restore again;
- measure query latency, storage throughput, and failover;
- confirm alerts arrive from the target environment.

Define acceptable differences before the migration. Timestamps, volatile cache rows, and asynchronous counters may not compare byte-for-byte.

## Cut Over with a Rollback Boundary

A controlled cutover uses explicit gates:

1. lower DNS TTL far enough in advance to affect existing caches;
2. stop background jobs and source writes;
3. drain requests and record the final source position;
4. wait for replication to reach that position;
5. synchronize sequence values and other nonreplicated state;
6. make the target writable;
7. switch routing and run smoke tests;
8. observe errors, lag, and business transactions.

Once the target accepts writes, rolling traffic back to the old source can lose or fork new data. Define a point of no return. A post-cutover rollback may require reverse replication or another migration, not a DNS change.

Keep the source read-only for the approved safety period, subject to privacy and retention rules. Protect its volumes with an intentional `Retain` policy before deleting claims, and verify the underlying provider resources rather than relying on Kubernetes object status.

## Rehearse with Production-Shaped Data

Run the process on representative size and write rate. Measure:

```text
RPO = cutover time - latest source change present on target
RTO = target service accepted - source service stopped
```

Include transfer throttling, source-log growth, restore parallelism, DNS behavior, and post-restore maintenance such as index statistics. A backup created successfully is only half of the test; a timed, verified restore is the evidence that matters.

## Official Documentation

- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [CSI VolumeSnapshot specification](https://github.com/kubernetes-csi/external-snapshotter/tree/master/client/config/crd)
- [PostgreSQL backup and restore](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [AWS DataSync documentation](https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html)
- [Google Storage Transfer Service overview](https://cloud.google.com/storage-transfer/docs/overview)

## Conclusion

Stateful Kubernetes portability is a data engineering and operations problem wrapped around a Kubernetes deployment. Build target storage from target CSI drivers, move data with an application-aware mechanism, validate content and behavior, and make the rollback boundary explicit. YAML moves desired state; a rehearsed data path moves the service.
