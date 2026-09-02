# Why Geode Disk Usage Stays High After Deletes and Compaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Disk Space, Data Persistence, Troubleshooting, Storage

Description: Understand why Geode deletes append records instead of shrinking files, then reclaim eligible oplogs safely with online or offline compaction.

---

Deleting entries from an Apache Geode persistent region changes the region immediately, but it does not edit old bytes out of the middle of a disk file. Geode uses append-oriented operation logs, or **oplogs**. A destroy adds a new record and makes earlier records for that key garbage. Disk space becomes reclaimable only after the oplog is closed, becomes eligible, and is compacted.

This is expected log-structured storage behavior, not evidence that the destroy failed. Confirm the region entry count separately from filesystem use before taking action.

## Read the Oplog Files as One Store

A Geode disk store contains management files and numbered oplog files. The important extensions include:

- `.crf`, which records creates, updates, and values;
- `.drf`, which records destroy operations;
- `.krf`, an optional key and value-offset file that can improve recovery; and
- `.if`, the initialization and metadata file for the store.

The files and all configured disk directories form one disk store. Never delete, rename, or selectively copy one file because it appears old. A destroy record may depend on an earlier create record, and store metadata identifies the complete history Geode needs for recovery.

When Geode opens a new oplog, it initializes it at `max-oplog-size`, split between the CRF and DRF. The default maximum is 1 GB. When the oplog closes, Geode shrinks those files to the bytes actually used and may create a KRF. This preallocation means `ls` can show a sudden large current file even on a small region.

## A Delete Creates Garbage; It Does Not Punch a Hole

Consider one key:

```text
oplog 1: CREATE order-42 = version A
oplog 2: UPDATE order-42 = version B
oplog 3: DESTROY order-42
```

After the destroy, `/orders` correctly has no `order-42`. The create and update records are obsolete, while the destroy record remains necessary to represent the current history. Geode tracks which records are live and which are garbage, but it does not rewrite every oplog on each update or delete; doing so would turn a cheap append into random I/O and constant file churn.

Compaction copies live records from eligible old oplogs into the current log, then removes the old oplog files. That file removal is when the filesystem can report less used space.

## The Current Oplog Cannot Be Compacted

The active oplog is not eligible for online compaction, regardless of how much garbage it contains. It must roll first. Rolling occurs when it reaches `max-oplog-size`, and the Java `DiskStore.forceRoll()` API can request a roll:

```java
DiskStore store = cache.findDiskStore("OrdersStore");
store.forceRoll();
```

Manual compaction through `DiskStore.forceCompaction()` checks whether the active oplog itself needs compaction, rolls it when necessary, and then compacts eligible closed logs. The `gfsh compact disk-store` command uses this online compaction path.

Do not force a roll after every delete. Frequent rolling creates overhead and extra files. It is useful after a known bulk-delete window or before a controlled manual compaction.

## Understand the Compaction Threshold

With the default configuration, `auto-compact=true` and `compaction-threshold=50`. A closed oplog is eligible when its **live** content percentage falls below the threshold. This wording matters:

- 30% live and 70% garbage: eligible at a threshold of 50;
- 60% live and 40% garbage: not eligible at a threshold of 50; and
- the active oplog: never eligible for online compaction yet.

Raising the threshold makes logs eligible while they contain more live data, which can reclaim space sooner but copies more live bytes and increases I/O. Lowering it waits for more garbage, reducing copy amplification but retaining disk longer. Tune from measured write patterns and storage headroom.

The rough official sizing guidance for mixed updates and deletes with automatic compaction is:

```text
oplog space ~= live data / (compaction-threshold / 100)
```

At 50%, plan for roughly twice the live data, plus burst and compaction lag. That is an estimate, not a cap.

## Configure Automatic and Manual Compaction Intentionally

A disk store configured for normal automatic compaction and operator-triggered online compaction might use:

```text
gfsh> create disk-store --name=OrdersStore \
  --dir=/data/geode/orders#1536000 \
  --max-oplog-size=512 \
  --auto-compact=true \
  --compaction-threshold=50 \
  --allow-force-compaction=true \
  --disk-usage-warning-percentage=75 \
  --disk-usage-critical-percentage=90
```

`allow-force-compaction` defaults to false because Geode retains additional information for forced compaction. It must be true before this online command can compact the store:

```text
gfsh> compact disk-store --name=OrdersStore --groups=orders-servers
```

The command acts on members in the target groups that have the named store and uses each store's configured compaction threshold. “Nothing to compact” can mean the files are active, their live percentage is still above the threshold, or automatic compaction already processed them. It does not prove compaction is broken.

If automatic compaction is disabled, capacity depends on every operation accumulated between manual runs. Build a tested schedule and retain enough space for the longest missed run. If auto-compaction is disabled and the configured directories reach their capacity, region operations can block because Geode cannot roll to a new oplog.

With automatic compaction enabled, Geode may create a new oplog beyond a configured directory-size limit and log a warning while it tries to compact. The directory limit is therefore not a hard filesystem quota. Monitor actual free bytes and set volume warning and critical thresholds.

## Use Offline Compaction Only with the Store Offline

Offline compaction can compact every oplog as far as possible because there is no active application log. Stop the member that owns the store, supply **all** disk directories, and run:

```text
gfsh> compact offline-disk-store \
  --name=OrdersStore \
  --disk-dirs=/data/geode/orders \
  --max-oplog-size=512 \
  -J=-Xmx4g
```

The offline tool locks the store, so a member cannot start midway through the operation. A large store can require substantial heap; size `-J=-Xmx` for a tested copy of production data.

Before maintenance, validate and back up the store. After compaction, validate again:

```text
gfsh> validate offline-disk-store \
  --name=OrdersStore \
  --disk-dirs=/data/geode/orders
```

Do not run offline compaction against the baseline directory of an incremental backup. Compaction changes oplog files and can invalidate the backup chain's assumptions.

## Diagnose Why Usage Still Has Not Fallen

If deleted entry counts are correct but space remains high, check these causes in order.

### 1. The garbage is in the active oplog

A bulk delete that fits inside one large current oplog leaves it ineligible. Wait for a normal roll or perform one controlled forced compaction when configuration allows it.

### 2. Closed oplogs still contain too much live data

The region may have deleted many entries overall while each individual oplog remains above the live-data threshold. Inspect compaction statistics and file turnover before changing the threshold.

### 3. The compactor cannot keep up

Compaction competes for storage throughput. Look for high disk latency, queued disk tasks, continuous write bursts, and bytes of garbage generated per second versus bytes compacted per second. Adding more simultaneous manual compaction can make an overloaded device worse.

### 4. The store contains other live data

One disk store can hold several persistent regions, overflow data, subscription queues, gateway sender queues, and PDX metadata. Deleting `/orders` does not remove live records for those users. Inventory every region and queue attached to the store.

### 5. The measurement is misleading

Compare:

- Geode's `DiskDirStatistics.diskSpace`;
- allocated filesystem blocks reported by `du`;
- overall volume use reported by `df`; and
- apparent file sizes reported by `ls`.

Preallocation, sparse-file accounting, snapshots, and a process holding an unlinked file can make these measurements differ. Also check backup directories, logs, heap dumps, and unrelated files on the same volume.

### 6. Live data or routing skew replaced the reclaimed space

New puts can consume space as quickly as compaction releases it. Compare entry counts, serialized size, bucket distribution, and per-member growth. A hot partition can fill one member while cluster-wide totals look stable.

## Monitor the Reclamation Pipeline

Track the states that lead to free space, not only the final volume percentage:

- current oplog size and time since last roll;
- closed oplog count;
- live versus garbage bytes or compactable-record counts;
- compaction count, duration, and bytes copied;
- disk tasks waiting and write latency;
- actual volume free space and hours to the critical threshold; and
- disk warning or cache-closure messages.

Use Geode's management view alongside OS tools:

```text
gfsh> list disk-stores
gfsh> describe disk-store --name=OrdersStore --member=server-1
gfsh> show metrics --member=server-1
```

A healthy system may temporarily grow after a delete burst and then fall after rolling and compaction. The actionable failure is sustained growth where eligible garbage generation exceeds reclamation throughput or free-space headroom is too small to complete the next compaction.

## Avoid Dangerous “Fixes”

Never reclaim space by:

- deleting old-looking CRF, DRF, KRF, IF, or lock files;
- copying only some directories from a multi-directory store;
- running an offline tool while the member is online;
- lowering the critical threshold after the volume is already nearly full;
- revoking the disk store to address ordinary capacity pressure; or
- assuming redundant region copies replace a backup.

If capacity is approaching the critical threshold, reduce incoming writes, add or migrate storage using a documented offline procedure, and secure a tested backup. Compaction itself needs resources; waiting until the last few free gigabytes can remove the headroom required to recover.

## Conclusion

Geode deletes are logical operations appended to a log. Earlier bytes become garbage but remain allocated until the containing oplog closes, falls below the live-data threshold, and compacts. Configure rolling and compaction as one system, monitor eligibility and throughput, preserve enough headroom for copying live records, and use only Geode's online or offline tools to reclaim space safely.

## Official References

- [Disk store operation logs](https://geode.apache.org/docs/guide/latest/managing/disk_storage/operation_logs.html)
- [Running compaction on disk-store log files](https://geode.apache.org/docs/guide/latest/managing/disk_storage/compacting_disk_stores.html)
- [Designing and configuring disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/using_disk_stores.html)
- [Disk store configuration parameters](https://geode.apache.org/docs/guide/latest/managing/disk_storage/disk_store_configuration_params.html)
- [`compact disk-store` and `compact offline-disk-store`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/compact.html)
- [How disk stores work](https://geode.apache.org/docs/guide/latest/managing/disk_storage/how_disk_stores_work.html)
- [Geode statistics reference](https://geode.apache.org/docs/guide/latest/reference/statistics_list.html)
