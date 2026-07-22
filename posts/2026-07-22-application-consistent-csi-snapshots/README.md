# How to Make CSI Snapshots Application-Consistent for PostgreSQL, MySQL, and MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, PostgreSQL, MySQL, MongoDB, Application Consistency

Description: Coordinate database quiescing, multi-volume capture, and recovery validation around Kubernetes CSI snapshots.

---

CSI snapshots operate at the storage layer. To make one application-consistent, the database must first reach a documented recoverable boundary, every required volume must be captured together, and writes must resume only after that capture point is secured.

The most portable method is a clean database shutdown followed by snapshots of all data and log PVCs. Online methods can reduce downtime, but they are database- and topology-specific. Test them against the exact database version, CSI driver, storage backend, and operator you run.

## Distinguish Three Consistency Levels

- **Storage crash-consistent:** blocks reflect a point in time as if power failed. Journaling or WAL may recover them.
- **Write-order consistent across volumes:** related volumes share one storage point, normally through a CSI volume group snapshot.
- **Application-consistent:** the database coordinated buffers, transactions, journals, and metadata so its supported recovery procedure can use the copy.

A filesystem freeze flushes pending filesystem I/O and pauses new writes to that filesystem. It does not, by itself, tell a database to establish a logical backup boundary. Conversely, a database checkpoint does not guarantee that several PVCs are snapshotted at the same instant.

## Use a Failure-Safe Workflow

The generic sequence is:

1. Route traffic away or pause new writes.
2. Wait for in-flight work according to application semantics.
3. Run the database's documented checkpoint, lock, or shutdown operation.
4. Keep that state active while requesting the snapshot or group snapshot.
5. Wait for the storage operation to pass the boundary required by the driver and backup controller.
6. Always unfreeze, unlock, or restart in a `finally`-style cleanup path.
7. Wait for `readyToUse: true` and record the bound content and provider handle.
8. Restore into isolation and run database-native validation.

Create the snapshot only after quiescing:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-consistent-20260722t020000z
  namespace: database
spec:
  volumeSnapshotClassName: premium-csi-backup
  source:
    persistentVolumeClaimName: database-data
```

For several PVCs, individual manifests applied together are still separate operations. Kubernetes 1.36 provides the GA `groupsnapshot.storage.k8s.io/v1` volume group snapshot API, but the CSI driver must implement the group snapshot capability. A group snapshot provides storage write-order consistency; database coordination can still be required.

## PostgreSQL

PostgreSQL's official filesystem-backup documentation gives two safe foundations.

The simplest is a cold snapshot: stop PostgreSQL cleanly, snapshot the complete database cluster, including every tablespace and required WAL location, then start it again. Merely blocking client connections is not equivalent to stopping the server because internal buffers and background work remain.

PostgreSQL also documents taking a consistent frozen filesystem snapshot while the server runs. On restore, PostgreSQL treats that copy like an unclean shutdown and replays WAL. Include the WAL files, and capture data, WAL, and tablespaces simultaneously. Running `CHECKPOINT` first can reduce recovery time, but the result is still fundamentally a crash-recovery workflow rather than a clean shutdown image.

If simultaneous storage snapshots are not possible, PostgreSQL recommends a continuous-archiving base backup instead of pretending sequential volume snapshots are atomic. `pg_basebackup` plus WAL archiving is often the better online backup boundary and adds point-in-time recovery.

Practical PostgreSQL rules are:

- snapshot the entire cluster, not selected table files;
- include `pg_wal` and all external tablespaces;
- keep server major-version and extension compatibility in the restore plan;
- save WAL beyond the snapshot according to the required recovery point;
- run a restore and allow crash recovery to complete before judging the data.

## MySQL

For a cold physical snapshot, stop `mysqld` cleanly and capture the complete data directory plus binary logs and any separately located files required by the deployment. This avoids ambiguity across storage engines.

For an online filesystem snapshot, MySQL 8.4 documents this sequence:

```sql
FLUSH TABLES WITH READ LOCK;
-- Keep this exact client session open while another process takes the snapshot.
UNLOCK TABLES;
```

`FLUSH TABLES WITH READ LOCK` obtains a global read lock after flushing tables. It can wait behind long-running transactions or metadata locks. Most importantly, the lock belongs to the live client connection. Running `mysql -e 'FLUSH TABLES WITH READ LOCK'` as a short pre-hook is wrong: the process exits, the connection closes, and the lock is released before the snapshot.

Automation needs a coordinator that keeps the session open, confirms the lock, triggers and observes the snapshot from another control path, then unlocks even after a timeout. Capture all storage-engine files and required logs together. `FLUSH TABLES ... FOR EXPORT` is for exporting named InnoDB tablespaces; it is not a general whole-instance snapshot recipe.

For primarily InnoDB workloads, a logical `mysqldump --single-transaction` or a supported physical backup product may produce a better online backup with less write blocking. Include binary-log or GTID coordinates when point-in-time recovery or replica seeding is required.

## MongoDB

MongoDB's filesystem snapshot documentation supports snapshots of self-managed standalone servers and replica sets. For WiredTiger data and journal files on different volumes, MongoDB requires writes to be suspended to create a coherent copy.

The documented lock sequence is:

```javascript
db.fsyncLock()
// Take the storage snapshot while writes remain locked.
db.fsyncUnlock()
```

`db.fsyncLock()` flushes pending writes and locks the database. Do not leave the instance locked after a snapshot failure. In a replica set, MongoDB recommends using a secondary that is not serving reads, such as a hidden member, for this process. Verify that it has reached an acceptable replication point before locking it.

Sharded clusters require the separate MongoDB sharded-cluster backup procedure. Independently snapshotting shards and config servers can create a recovery point that never existed. Use the vendor-supported coordinator or backup product for that topology.

MongoDB also warns that snapshots usually share the source storage infrastructure and should be archived to another system. Application consistency does not imply disaster independence.

## Automating With Backup Hooks

Velero supports pre- and post-backup exec hooks on selected pod containers. Official documentation notes that commands are not run through a shell unless the command explicitly invokes one, and each hook has error and timeout behavior.

Hooks are useful for `fsfreeze`, a checkpoint, or a database-specific wrapper, but verify these properties:

- the pre-hook state persists after the command returns;
- the controller does not snapshot another PVC outside that state;
- the post hook runs on every success and failure path;
- a watchdog can recover an abandoned lock;
- hook credentials have only the required database privilege;
- logs prove the lock interval covered snapshot creation.

For MySQL, a one-shot hook cannot hold a session-scoped read lock. For a distributed database, a hook on one pod cannot establish cluster-wide consistency. Prefer an operator-native backup API when one exists because it understands topology and leader changes.

## Restore Validation Is Part of Consistency

Restore into a new PVC and isolated namespace. Prevent the application from initializing an apparently unfamiliar directory, and disable outbound side effects. Then perform database-specific checks:

- PostgreSQL: inspect startup and WAL-replay logs, connect, query expected recovery markers, and run appropriate logical or relation checks.
- MySQL: inspect InnoDB recovery, verify tables, GTID or binary-log position, and application invariants.
- MongoDB: inspect WiredTiger recovery, replica-set metadata, collection counts, and representative queries.

Test loss of the quiesce coordinator, a snapshot timeout, pod rescheduling, leader change, and a post-hook failure. Monitor how long writes remain paused and alert when the lock exceeds its expected window.

The rule is simple: storage creates the copy, but the database defines what makes that copy recoverable. Keep those responsibilities explicitly connected in one tested workflow.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes 1.36: Volume Group Snapshots GA](https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/)
- [PostgreSQL 18: File System Level Backup](https://www.postgresql.org/docs/current/backup-file.html)
- [PostgreSQL 18: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [MySQL 8.4: Database Backup Methods](https://dev.mysql.com/doc/refman/8.4/en/backup-methods.html)
- [MySQL 8.4: `FLUSH TABLES WITH READ LOCK`](https://dev.mysql.com/doc/refman/8.4/en/flush.html#flush-tables-with-read-lock)
- [MongoDB 8.0: Back Up with Filesystem Snapshots](https://www.mongodb.com/docs/v8.0/tutorial/backup-with-filesystem-snapshots/)
- [Velero 1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)
