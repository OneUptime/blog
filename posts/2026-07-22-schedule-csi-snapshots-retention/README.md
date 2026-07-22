# How to Schedule CSI Volume Snapshots and Enforce Retention in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, Velero, Backup Schedule, Retention

Description: Build a scheduled CSI snapshot policy with explicit retention, consistency, monitoring, and off-cluster protection.

---

Kubernetes defines how to request a CSI snapshot, but it does not natively schedule individual `VolumeSnapshot` objects or prune them by age. A production policy therefore needs an additional controller such as Velero, a storage-vendor operator, or a carefully maintained CronJob.

Prefer a backup controller when snapshots protect production data. Scheduling is the easy part; correct selection, application hooks, overlapping runs, expiration, provider cleanup, metadata backup, and restore testing are the real job.

## Start With Recovery Requirements

Translate the workload's objectives into policy before writing cron syntax:

- **RPO:** maximum acceptable data loss determines frequency.
- **Retention:** hourly, daily, weekly, and monthly recovery points may need different lifetimes.
- **RTO:** fast local snapshots and slower portable copies can form separate tiers.
- **Consistency:** decide whether crash consistency, write-order consistency, or application consistency is required.
- **Failure domain:** decide whether data must survive deletion of a namespace, cluster, account, region, or storage system.

A snapshot every hour retained for seven days gives at most a one-hour scheduling interval, not a guaranteed one-hour RPO. A failed run, an overloaded CSI controller, or a database that cannot recover can widen actual data loss. Measure successful, restorable recovery points rather than created API objects.

## Verify the Snapshot Foundation

Before scheduling, prove one manual cycle:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: orders-manual-test
  namespace: orders
spec:
  volumeSnapshotClassName: premium-csi-backup
  source:
    persistentVolumeClaimName: orders-data-orders-0
```

Wait for readiness and inspect the snapshot before restoring it to a separate test PVC:

```bash
kubectl -n orders wait --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/orders-manual-test --timeout=15m
kubectl -n orders describe volumesnapshot orders-manual-test
```

Confirm that the class's `driver` matches the source PV's CSI driver and choose its `deletionPolicy` intentionally. `Delete` suits snapshots whose controller owns expiration. `Retain` requires a separate reclamation workflow and should not be used as a substitute for immutable backup storage.

## Schedule With Velero

Velero can schedule Kubernetes resource backups and CSI volume snapshots. In Velero 1.14 and later, CSI support is integrated; install or configure the server with the `EnableCSI` feature. If using the built-in CSI snapshot data mover, also install the node agent and configure a backup storage location.

This example runs daily at 02:00 UTC, includes one namespace, moves snapshot data into backup storage, and makes each backup eligible for garbage collection after 30 days:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: orders-daily
  namespace: velero
spec:
  schedule: "CRON_TZ=Etc/UTC 0 2 * * *"
  useOwnerReferencesInBackup: false
  template:
    includedNamespaces:
      - orders
    snapshotVolumes: true
    snapshotMoveData: true
    storageLocation: default
    ttl: 720h0m0s
```

`snapshotMoveData: true` is significant: Velero first creates a CSI snapshot and then uses a data mover to copy its contents to the configured backup repository. The transient CSI snapshot is removed after the backup completes. This provides a more portable recovery artifact than leaving only a provider snapshot beside the source volume.

Without data movement, Velero can still orchestrate native CSI snapshots. Those can be much faster, but restore normally depends on the original storage provider, driver, region or zone, permissions, and encryption keys.

Select the `VolumeSnapshotClass` according to your Velero version's documented precedence. Velero supports the Kubernetes default-class annotation, an explicit `velero.io/csi-volumesnapshot-class: "true"` label, and per-PVC or per-backup/schedule annotations. Kubernetes requires at most one default class per CSI driver, and Velero requires at most one labeled class per driver.

Create one backup from the schedule immediately to test its template:

```bash
velero backup create orders-daily-test --from-schedule orders-daily --wait
velero backup describe orders-daily-test --details
velero backup logs orders-daily-test
```

Inspect `DataUpload` resources when using snapshot data movement:

```bash
kubectl -n velero get datauploads \
  -l velero.io/backup-name=orders-daily-test
```

Do not count the run as successful until the backup and every volume operation complete.

## Understand What TTL Deletes

Velero's `ttl` is attached to each generated backup. After expiration, the backup becomes eligible for garbage collection. Velero then removes the objects and storage snapshots it owns according to its lifecycle rules. Cleanup is asynchronous, so TTL is not a guarantee that bytes disappear at the exact deadline.

Avoid relying on Kubernetes owner references for retention. The Velero documentation warns that deleting a schedule with backup owner references can make Kubernetes garbage collection and Velero's object-storage synchronization compete. Leaving `useOwnerReferencesInBackup: false` gives Velero's backup deletion workflow control over associated data.

Retention must also be aligned across layers:

- Velero backup TTL;
- `VolumeSnapshotContent` deletion policy;
- backup-repository maintenance;
- object-storage lifecycle and compatible versioning or immutability controls;
- cloud-provider snapshot retention or recycle-bin rules.

If object storage expires data before Velero's catalog, restores fail. If provider snapshots are retained after catalog deletion, costs grow invisibly. Velero 1.18 must update backup metadata in object storage, so verify provider-specific compatibility before enabling retention locks or immutability. Document which controller owns the final deletion.

## Direct VolumeSnapshot Scheduling

A Kubernetes `CronJob` can create `VolumeSnapshot` resources, but it is only a reasonable choice when the team is prepared to own a snapshot controller of its own. The job needs a dedicated ServiceAccount and narrowly scoped RBAC to create, list, and delete snapshots in selected namespaces, read the targeted PVCs and their PVs, and read the relevant `VolumeSnapshotClass` and `VolumeSnapshotContent` state. Its logic must:

1. generate collision-free names and apply policy labels;
2. refuse to snapshot an unexpected or unbound PVC;
3. wait for `readyToUse`, with a bounded timeout;
4. expose failures as metrics or alerts;
5. avoid overlapping runs;
6. delete only snapshots carrying its exact ownership label;
7. preserve a minimum number of known-good recovery points;
8. respect legal holds and failed backup investigations;
9. verify provider deletion for `Delete` content;
10. coordinate quiesce and unquiesce even after errors.

Set the CronJob's `concurrencyPolicy: Forbid`; Kubernetes documents that this skips a new run when the previous job is still active. That prevents overlap, but a skipped run must still alert because it affects RPO. Pin the job image by digest and test clock, time-zone, API, and retry behavior during upgrades.

Never implement pruning as “delete the oldest snapshots in the namespace.” Users and other controllers may own those objects. Filter by a controller-specific label, verify the bound content and policy, and keep failed or held snapshots out of automatic deletion.

## Add Application Consistency

A storage snapshot of a mounted filesystem is generally crash-consistent. Databases may recover using WAL or journals, but that is not the same as a clean application recovery point. Use the database vendor's documented quiesce procedure or operator-native backup integration.

Velero supports pre- and post-backup exec hooks. Hooks run commands directly, not through a shell unless a shell is explicitly included. A freeze or database lock must remain active until the snapshot operation has crossed the required point, and the post hook must reliably release it. Test hook failure and timeout paths; an indefinite database lock is worse than a missed snapshot.

For an application spread across multiple PVCs, sequential `VolumeSnapshot` objects do not have a common point in time. Use CSI volume group snapshots when the Kubernetes version, group-snapshot CRDs and controllers, backup controller, and CSI driver support them to obtain a crash-consistent common point in time. Quiesce the whole application for the complete sequence when application consistency is required.

## Monitor the Recovery Pipeline

Alert on more than scheduler execution:

- schedule has not produced a completed backup within the RPO window;
- snapshot remains unready or reports an error;
- `DataUpload` fails, stalls, or exceeds its timeout;
- backup repository is unavailable;
- retained snapshot count or provider spend exceeds policy;
- hooks fail or leave the application quiesced;
- restore drills exceed RTO or fail integrity checks.

Run automated restore tests into an isolated namespace. Start the application with external side effects disabled, validate expected records or checksums, and record elapsed recovery time. Periodically test a recovery point near the end of each retention tier, not only the newest backup.

Scheduling creates opportunities to recover. Verified retention, independent storage, and practiced restoration turn those opportunities into a backup system.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes API: CronJob `concurrencyPolicy`](https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/)
- [Velero 1.18: Schedule API](https://velero.io/docs/v1.18/api-types/schedule/)
- [Velero 1.18: Backup Scheduling and Time Zones](https://velero.io/docs/v1.18/backup-reference/#schedule-a-backup)
- [Velero 1.18: CSI Snapshot Data Movement](https://velero.io/docs/v1.18/csi-snapshot-data-movement/)
- [Velero 1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)
