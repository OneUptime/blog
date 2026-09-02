# How to Configure Persistent Regions and Disk Stores Without Filling the Disk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Data Persistence, Disk Space, Storage, Monitoring

Description: Size, isolate, monitor, compact, and back up Geode disk stores so persistent regions survive failures without exhausting their filesystems.

---

An Apache Geode persistent region writes every entry key and value to a member-local disk store as well as keeping the active region in memory. Persistence protects data across member restarts; it does not make disk capacity self-managing and it does not replace redundancy or backups.

The safe design starts with four separate decisions:

1. how much live data each member will persist;
2. how much temporary oplog and compaction headroom it needs;
3. which filesystem and member-specific directories hold the store; and
4. what the cluster should do before the volume is actually full.

Configuring only a directory size is insufficient. With automatic compaction enabled, Geode can create a new oplog beyond a configured directory capacity while it tries to recover space. The filesystem's real free space and the disk-usage thresholds are the final safety boundary.

## Choose Persistence, Overflow, or Both Deliberately

The terms solve different problems:

- **Persistence** writes all region keys and values to disk so the member can recover them after restart.
- **Overflow** evicts selected values from memory to disk; keys remain in memory.
- **Persistent overflow** persists every entry and evicts colder values from memory under the configured eviction policy.

Do not enable overflow as a substitute for sizing heap and disk. An overflow miss reads the value back from disk and may overflow another value; a workload larger than both resources still fails.

For a partitioned region with one redundant copy:

```text
gfsh> create region --name=orders \
  --type=PARTITION_PERSISTENT \
  --redundant-copies=1 \
  --disk-store=OrdersStore \
  --enable-synchronous-disk=true
```

Use `REPLICATE_PERSISTENT` when every host must keep a full copy, and `PARTITION_PERSISTENT_OVERFLOW` when the region also needs heap-based overflow. Partitioning usually gives a more scalable per-member disk footprint; each member persists its primary and redundant buckets rather than a full replica.

## Estimate More Than the Live Data Size

Geode disk stores are operation logs. Updates and destroys append records; obsolete records remain until an eligible closed oplog is compacted. Disk sizing must include live data, garbage created between compactions, currently open oplogs, compaction copy space, recovery files, queue persistence, metadata, and growth during operational response.

For mixed updates and deletes with automatic compaction, the official guidance gives this rough upper bound:

```text
required oplog space ~= live data / (compaction-threshold / 100)
```

At the default `compaction-threshold=50`, that is roughly twice the live data size. It is not a hard guarantee: the compactor can lag behind a write burst, and the active oplog cannot be compacted until it rolls. Add explicit headroom for the largest plausible burst and for copying live records during compaction.

Calculate per member, not only cluster-wide. For a partitioned region, include redundant buckets and skew. A nominal 2 TB region on four evenly loaded members with one redundant copy starts near 1 TB of live data per member before serialization overhead and skew:

```text
2 TB logical data * (1 primary + 1 redundant copy) / 4 members = 1 TB/member
```

Then apply the oplog, compaction, and growth multipliers. Measure serialized entry size from representative data rather than estimating from Java object size.

## Give Every Member Private Disk Directories

Never point two Geode members at the same disk-store directory. A disk store is owned and locked by one member, and all files in all of its directories form one unit. Do not rename individual oplog files or copy only selected extensions.

Use dedicated volumes when practical, away from the operating system, swap, logs, and unrelated databases. If a store has multiple directories, put them on independent physical devices for useful throughput and failure-domain planning; multiple paths on the same full filesystem do not provide capacity isolation.

Create the directories and set ownership before starting production members. This example creates the same logical store on the `orders-servers` group, while each host resolves the path locally:

```text
gfsh> create disk-store --name=OrdersStore \
  --groups=orders-servers \
  --dir=/data/geode/orders#1536000 \
  --max-oplog-size=512 \
  --auto-compact=true \
  --compaction-threshold=50 \
  --allow-force-compaction=true \
  --disk-usage-warning-percentage=75 \
  --disk-usage-critical-percentage=90
```

The value after `#` is the configured directory capacity in megabytes. It is a Geode accounting limit for the store, not a filesystem quota and not a reservation. The warning and critical percentages refer to actual volume use. At the critical threshold Geode generates an error and closes the member's cache rather than continuing into total disk exhaustion.

Pick thresholds from response time, not convention. If the volume can consume 100 GB per hour during a burst and responders need two hours, a warning at only 5% free is already too late. Leave enough free space for compaction and other essential host activity below the critical threshold.

## Tune Oplog Rolling and Compaction Together

`max-oplog-size` controls the maximum size of an oplog before it rolls. The default is 1 GB. At creation, Geode preallocates the current oplog at its maximum size and shrinks it to used space when the log closes. A newly started store can therefore appear to consume a large block immediately.

Smaller oplogs roll more often and make obsolete data eligible for compaction sooner, but create more files and management overhead. Larger oplogs reduce roll frequency but can leave more garbage trapped in the active log and require more headroom. Start with a measured value such as 512 MB rather than blindly changing it to fix apparent preallocation.

With `auto-compact=true`, a closed oplog becomes eligible when its live percentage falls below `compaction-threshold`. At 50%, an oplog with less than half live data can compact. Geode copies its live records into the current log and deletes the old files; compaction is not an in-place shrink.

`allow-force-compaction=true` retains information needed for manual online compaction. It allows an operator to run:

```text
gfsh> compact disk-store --name=OrdersStore --groups=orders-servers
```

The command first makes appropriate logs eligible and compacts according to the configured threshold. Do not schedule it continuously. Compaction consumes disk bandwidth and CPU and can contend with region writes. If automatic compaction cannot keep up, first inspect write amplification, storage latency, live-data growth, and thresholds instead of piling on concurrent manual runs.

## Select Synchronous Writes from the Recovery Requirement

`--enable-synchronous-disk=true` writes the persistent operation to disk before the cache operation completes. Asynchronous disk writes can improve foreground latency by queueing operations and flushing based on `queue-size` and `time-interval`, but they enlarge the window of operations not yet durable if the process or host fails.

Choose this setting from the acceptable recovery point, then benchmark it on production-like storage. Redundant in-memory copies can improve availability but do not make an unflushed disk operation durable across a correlated power or site failure.

Do not mix persistence expectations unintentionally across hosts. Start persistent replicated members before non-persistent replicas. For partitioned persistence, keep region attributes, bucket count, colocation, redundancy, disk-store name, and PDX configuration consistent across the intended members.

## Persist PDX Metadata When the Data Uses PDX

PDX bytes depend on registry metadata. When persistent regions contain PDX data, configure PDX metadata persistence before servers start:

```text
gfsh> configure pdx --read-serialized=true --disk-store=PdxMetadata
```

Create and capacity-plan `PdxMetadata` on the relevant members, or use the default store deliberately. Back up PDX metadata together with the region stores. If PDX objects are used as persistent region keys, Geode requires their PDX metadata to use a different disk store from the region data; simple non-PDX keys remain the safer design.

## Monitor the Filesystem and the Store

Alert on trend and rate, not just a single percentage. Collect:

- filesystem total, used, and free bytes for every disk directory;
- Geode `DiskDirStatistics` such as `diskSpace`, `volumeFreeSpace`, and `volumeSize`;
- oplog count and growth rate;
- compactions, bytes compacted, and compaction backlog;
- pending asynchronous disk tasks and flush latency;
- server cache closures and disk warning log messages; and
- per-member region and bucket skew.

Use Geode inspection commands during diagnosis:

```text
gfsh> list disk-stores
gfsh> describe disk-store --name=OrdersStore --member=server-1
gfsh> show metrics --member=server-1
```

Also inspect the host filesystem directly. A Geode directory limit does not see another process filling the same volume, while the volume threshold does.

Useful alerts include projected hours to critical, compaction throughput below garbage creation rate, and one member growing materially faster than peers. The last condition can expose hot partition routing or redundancy imbalance before that member alone fills its disk.

## Operate Persistent Members for Recoverability

Use an orderly cluster shutdown:

```text
gfsh> shutdown --time-out=60
```

For a complete shutdown including locators:

```text
gfsh> shutdown --include-locators=true --time-out=60
```

The ordered shutdown synchronizes persistent partitioned data and improves the next recovery. On startup, start all members with persisted data at roughly the same time. A member with an older copy can wait indefinitely for the member holding the newest data; use `show missing-disk-stores` and logs to identify the dependency.

Do not revoke a missing disk store merely to make startup proceed. Revocation is for a store known to be unrecoverable and can discard the cluster's only newest copy. Once revoked, that store cannot be reintroduced.

Finally, schedule online backups to storage outside the member's data volume:

```text
gfsh> backup disk-store --dir=/mnt/geode-backups
```

Redundancy is not a backup, and a backup on the same nearly full device does not protect the cluster.

## Capacity Failure Checklist

When use rises unexpectedly:

1. Confirm whether growth is live entries, updates/deletes, a persistent gateway queue, or subscription overflow.
2. Check whether the largest oplog is still active and therefore ineligible for compaction.
3. Verify `auto-compact`, `compaction-threshold`, and storage latency on every member.
4. Compare the configured directory capacity with actual filesystem free space.
5. Check for unrelated files on the same volume.
6. Confirm the region is not growing faster than the original forecast or skewing to one member.
7. Back up before invasive offline maintenance.
8. Add storage or reduce incoming load before crossing the critical threshold.

Deleting entries does not immediately shrink oplog files. Do not manually remove `.crf`, `.drf`, `.krf`, `.if`, or lock files. Use online or offline Geode compaction procedures with the entire disk store in the correct state.

## Conclusion

Size each persistent member for live serialized data, redundancy, oplog garbage, compaction copying, bursts, and response time. Give members private directories on monitored volumes, set early warning and conservative critical thresholds, keep automatic compaction healthy, persist PDX metadata, and maintain tested off-volume backups. A directory limit is a planning input; real free space and operational headroom keep the cache alive.

## Official References

- [Designing and configuring disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/using_disk_stores.html)
- [Disk store configuration parameters](https://geode.apache.org/docs/guide/latest/managing/disk_storage/disk_store_configuration_params.html)
- [Configuring region persistence and overflow](https://geode.apache.org/docs/guide/latest/developing/storing_data_on_disk/storing_data_on_disk.html)
- [Disk store operation logs](https://geode.apache.org/docs/guide/latest/managing/disk_storage/operation_logs.html)
- [Running compaction on disk-store log files](https://geode.apache.org/docs/guide/latest/managing/disk_storage/compacting_disk_stores.html)
- [Starting and shutting down with disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/starting_system_with_disk_stores.html)
- [`create disk-store` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html)
- [Geode statistics reference](https://geode.apache.org/docs/guide/latest/reference/statistics_list.html)
