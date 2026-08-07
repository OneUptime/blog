# What `hdfs fsck` Can and Cannot Repair

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, fsck, Data Recovery, Troubleshooting

Description: Understand why hdfs fsck primarily reports HDFS damage, what its replicate, move, and delete actions do, and how to recover corrupt or missing blocks safely.

---

The name `fsck` invites the wrong mental model. A local filesystem checker can reason about on-disk allocation structures and sometimes rebuild them. HDFS has a different architecture: the NameNode owns file-to-block metadata, while DataNodes store replicas of those blocks. `hdfs fsck` queries that distributed state and reports inconsistencies; it does not invent the bytes of a replica that no longer exists.

That distinction determines whether an incident is automatically recoverable, administratively containable, or a true restore-from-source event.

## Start with a Non-Destructive Report

Run the smallest check that answers the question:

```bash
hdfs fsck /data/important
hdfs fsck /data/important -files -blocks -locations
hdfs fsck / -list-corruptfileblocks
```

Useful report terms mean different things:

- **Under-replicated:** fewer live replicas than the file's requested replication factor, but at least one usable replica may remain.
- **Mis-replicated:** replicas exist, but their placement does not satisfy the configured rack, upgrade-domain, or other placement policy.
- **Corrupt replica:** a DataNode or client detected data that failed checksum or integrity validation.
- **Missing block:** the NameNode has a block in a file's metadata but currently knows of no usable replica.
- **Open for write:** the file may still be under construction. `fsck` ignores open files by default unless asked to include them.

Add `-includeSnapshots` when snapshot-only references matter. Without it, a check of a snapshottable tree may not represent every block retained by snapshots.

## What HDFS Repairs Automatically

The NameNode continuously tracks replica health. When a DataNode stops heartbeating, a disk fails, or a replica is declared corrupt, the NameNode can schedule a copy from another healthy replica. No byte-level repair by `fsck` is required.

For example, suppose a replicated block has three copies and one fails checksum verification. If the other two are readable, HDFS can create a replacement elsewhere and later invalidate the bad replica. The incident is a redundancy and placement problem, not yet data loss.

Observe the transition rather than repeatedly launching broad scans:

```bash
hdfs dfsadmin -report
hdfs fsck /data/important -files -blocks -locations
```

If under-replication does not converge, investigate eligible target DataNodes, free space, failed volumes, decommission state, rack topology, storage policies, replication queues, and NameNode safe mode. Safe mode suppresses block replication.

## The Narrow Meaning of `-replicate`

Current Hadoop exposes this action:

```bash
hdfs fsck /data/important -replicate
```

The official commands guide describes it as initiating replication work so mis-replicated blocks satisfy block placement policy. It is useful when replicas exist but their topology or placement is wrong. It is not a generic “repair everything” switch.

In particular, `-replicate` cannot:

- reconstruct a missing block with no readable source replica;
- infer application records from adjacent HDFS blocks;
- repair corrupt bytes when every replica contains those corrupt bytes;
- override the absence of an eligible destination storage type or rack; or
- restore namespace entries that are absent from NameNode metadata.

After invoking it, monitor the NameNode's work and re-run a scoped report. An accepted command means work was initiated, not that all constraints can be satisfied.

## Why `-move` Is Containment, Not Repair

The following option moves corrupt files under `/lost+found`:

```bash
hdfs fsck /data/important -move
```

This can separate damaged files from a production path and may preserve recoverable block chains for forensic work. It does not recreate missing blocks or guarantee a semantically valid application file. Applications that expect the original path will also stop finding it.

Before using `-move`:

1. Save the complete `fsck` output.
2. Record snapshots, retention policies, and external copies.
3. Stop writers that could complicate the affected path.
4. Confirm how downstream jobs react to the path change.
5. Treat any recovered fragments as untrusted until the data format validates them.

If the data format is Parquet, Avro, ORC, SequenceFile, or another structured container, use that format's own reader and validation tools after HDFS-level containment.

## Why `-delete` Is Explicit Data Loss

This option deletes corrupt files:

```bash
hdfs fsck /data/important -delete
```

Deletion may make the remaining namespace report healthy because the files that referenced missing blocks no longer exist. That is cleanup, not recovery. Do not use it merely to turn a monitoring check green.

Before deletion, capture the file list, owners, permissions, replication, snapshots, lineage, and restore source. Prefer quarantining or restoring to a new path until consumers have verified the replacement.

## Diagnose the Replica Evidence

For an affected file, obtain block and location detail:

```bash
hdfs fsck /data/important/events.parquet -files -blocks -locations -replicaDetails
```

Then answer four questions.

### Does a healthy replica still exist?

If yes, make its DataNode stable and allow NameNode replication to restore redundancy. Avoid restarting all replica-holding nodes together.

### Is a replica merely offline?

A missing block is based on the NameNode's current inventory. A DataNode may be stopped, isolated, rejected because of a cluster ID mismatch, or unable to mount an existing volume. Recovering that original storage and letting it submit a full block report can make the replica visible again.

Do not format, initialize, or overwrite suspect DataNode directories. Preserve them read-only when hardware is unstable and work from a clone if low-level recovery is required.

### Did a topology change make placement impossible?

Under- or mis-replication can persist when the requested replication factor exceeds eligible nodes, a storage policy requires an unavailable type, hosts are excluded, or rack mappings collapse distinct racks into one. Fix eligibility before asking for more replication.

### Does every known copy fail integrity checks?

HDFS checksums can identify corruption but cannot derive the original content. Recovery must come from a backup, snapshot that still references a healthy block, upstream source, another cluster, or application-level regeneration.

## Build a Recovery Plan by Damage Class

### At least one good replica remains

Stabilize the source node, restore eligible targets, leave safe mode if its normal conditions are satisfied, and monitor re-replication. Validate the file using an application reader after HDFS reports healthy placement.

### A DataNode or disk is temporarily unavailable

Keep the NameNode metadata intact. Restore the original mount, permissions, identity, and network path. Start the DataNode and watch registration and block-report processing. The goal is to make existing bytes visible, not create empty replacement storage under the same path.

### No replica remains

List every affected file and map it to a restore authority:

```bash
hdfs fsck / -list-corruptfileblocks > corrupt-files.txt
```

Restore to a staging path, validate checksums or record counts, then perform a controlled replacement. If the data is reproducible, document the exact upstream job and input version used to regenerate it.

### Namespace metadata itself is damaged

`fsck` is not a NameNode metadata recovery tool. Preserve `fsimage` and edit logs and follow HDFS recovery procedures. NameNode recovery mode can discard data, so back up all metadata before using it and involve the cluster recovery owner.

## Avoid Common Incident Mistakes

- Do not assume a zero exit from a later scan proves deleted data was recovered.
- Do not use `/` with verbose flags repeatedly on a very large namespace when a scoped path or corrupt-block listing suffices.
- Do not lower replication and call the incident resolved without restoring the intended failure tolerance.
- Do not restart all DataNodes simultaneously while the NameNode is trying to rediscover replicas.
- Do not delete snapshots until you know whether they retain the last healthy reference.
- Do not copy files over the damaged path before preserving evidence and lineage.

## Verify the Outcome at Two Layers

HDFS health and data correctness are separate gates. First confirm the block state:

```bash
hdfs fsck /data/important -files -blocks -locations
```

Then use the owning application's checks: file-format readers, manifests, row counts, event offsets, checksums, or reconciliation queries. HDFS can confirm that replicas agree with their stored checksums; it cannot determine whether the producer wrote the correct business data.

## Official Documentation

- [HDFS Users Guide: `fsck`](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html#fsck)
- [HDFS Commands Guide: `fsck`](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html#fsck)
- [HDFS Architecture: re-replication](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html#Data_Disk_Failure.2C_Heartbeats_and_Re-Replication)
- [HDFS Architecture: data integrity](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html#Data_Integrity)

## Conclusion

`hdfs fsck` is primarily an evidence and classification tool. HDFS can automatically replace a bad or missing replica only when another healthy source exists, and current `-replicate` can initiate limited placement correction. When every copy of a block is gone, no command-line flag can recreate its bytes. Preserve evidence, restore original replicas when possible, and use a verified external source when the damage is real.
