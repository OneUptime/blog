# HDFS Has Free Space but Writes Still Fail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, DataNode, Capacity, Troubleshooting

Description: Reconcile HDFS free-space reports with DataNode reserved space, local disk health, quotas, storage policies, and placement rules when writes still fail.

---

“HDFS has 40 TB free” does not prove that a new block has a legal destination. The total may span nodes, storage types, and volumes that are unavailable to the requested file. It may also be stale, subject to a namespace quota, or larger than the space the operating system can safely allocate.

Diagnose the failed write by separating three views: the filesystem view returned to the client, the NameNode's view of DataNodes, and each DataNode's local filesystem view. Then test placement and policy constraints. A single aggregate percentage hides most of the useful evidence.

## Start with the Exact Failure

Retain the client exception and timestamp. Messages such as “could only be written to 0 of the 1 minReplication nodes,” quota exceeded, no space left on device, no required storage type, or pipeline recovery failure point to different layers.

Confirm which filesystem and path the client addressed:

```bash
hdfs getconf -confKey fs.defaultFS
hdfs dfs -stat '%n %b %r' /data/target
hdfs dfs -df -h /data/target
```

`hdfs dfs -df` reports capacity, used space, and available space for the filesystem containing the path. It is useful as an aggregate, but it does not promise that any particular DataNode, rack, or storage type can accept the next block.

If the path does not yet exist, inspect its nearest existing parent. Also verify the failing application did not load another configuration directory or logical nameservice.

## Compare the NameNode's DataNode View

Run the administrative report against the same nameservice:

```bash
hdfs dfsadmin -report
hdfs dfsadmin -report -live
hdfs dfsadmin -report -dead
hdfs dfsadmin -report -decommissioning
```

For each candidate DataNode, examine configured capacity, DFS used, non-DFS used, DFS remaining, service state, and last contact. Also check the NameNode's cluster-wide failed-volume count and the affected DataNode's logs for volume failures. Look for patterns hidden by the cluster total:

- empty capacity concentrated on dead, decommissioning, or maintenance nodes;
- only a few nearly full live nodes in the required rack or storage tier;
- one or more failed volumes reducing usable capacity;
- a recently restarted or stale node whose state has not settled; or
- non-DFS data consuming space on volumes that also store HDFS blocks.

Do not count a decommissioning node as future write headroom. HDFS must place new replicas on eligible, in-service targets and still satisfy its block-placement rules.

NameNode JMX and metrics are valuable when the problem is intermittent. Compare `CapacityTotal`, `CapacityRemaining`, live/dead DataNode counts, volume failures, pending replication, and stale-node indicators around the failure time rather than relying only on a later snapshot.

## Inspect Every Local Data Volume

Log in to affected DataNodes and resolve the configured storage directories:

```bash
hdfs getconf -confKey dfs.datanode.data.dir
findmnt
df -h /data/hdfs
df -i /data/hdfs
```

Repeat `df` for every distinct filesystem behind `dfs.datanode.data.dir`. Check:

- byte capacity and inode capacity;
- whether the expected device is actually mounted;
- read-only remounts after I/O errors;
- ownership and permissions for the DataNode service account;
- filesystem, RAID, LVM, or cloud-volume errors;
- unexpectedly large non-HDFS directories on the same mount; and
- DataNode logs for failed-volume and disk-check messages.

A missing mount is especially dangerous. The mount-point directory can still exist on the root filesystem, allowing a DataNode to write to the wrong, much smaller device. Confirm device identity with `findmnt`, not just directory existence.

An inode-exhausted filesystem can return “no space left on device” while `df -h` shows bytes free. `df -i` exposes that case. Conversely, a thin-provisioned or network-backed volume can advertise logical free space that its lower storage layer cannot deliver.

## Account for HDFS Reserved Space

HDFS can deliberately leave part of each DataNode volume unavailable for block storage. The default calculator uses this property as an absolute number of bytes per volume:

```xml
<property>
  <name>dfs.datanode.du.reserved</name>
  <value>107374182400</value>
</property>
```

This example reserves 100 GiB on every applicable volume for non-HDFS use. Hadoop also supports directory-specific and storage-type-specific variants. The current configuration reference documents a percentage calculator through `dfs.datanode.du.reserved.calculator` and `dfs.datanode.du.reserved.pct`, plus conservative and aggressive calculators that combine absolute and percentage reservations.

Read the effective deployed configuration rather than a repository template:

```bash
hdfs getconf -confKey dfs.datanode.du.reserved.calculator
hdfs getconf -confKey dfs.datanode.du.reserved
hdfs getconf -confKey dfs.datanode.du.reserved.pct
```

Run those commands with the same DataNode configuration directory, or inspect the DataNode's startup output, because a client host can load different XML files.

Hadoop's reference warns that filesystem-level reservations made with tools such as `tune2fs` are external to HDFS accounting. The operating system can therefore reject an allocation even when Hadoop believes space remains. Preserve an OS safety margin and reconcile both layers before changing either reservation.

## Check Failed-Volume Tolerance

The `dfs.datanode.failed.volumes.tolerated` setting controls how many failed volumes a DataNode may tolerate before it stops offering service. Its default is zero in the current reference configuration. Raising the value can keep a multi-volume DataNode online after a disk failure, but it does not make the failed disk usable and can concentrate traffic on the surviving volumes.

Treat volume failure as a hardware or filesystem incident:

1. record the volume and affected DataNode;
2. verify block redundancy and cluster health;
3. repair or replace the failed storage under the DataNode administration procedure;
4. confirm the DataNode reports the intended volume set; and
5. re-evaluate capacity after block reports settle.

Do not delete DataNode block-pool directories to “free space” manually. NameNode metadata, replica state, and recovery procedures must remain coordinated.

## Rule Out Namespace and Space Quotas

Capacity can be available globally while the target directory has reached a quota. Inspect both namespace and space quotas:

```bash
hdfs dfs -count -q -h /data/target
```

The output includes quota, remaining quota, space quota, and remaining space quota before normal content counts. A namespace quota can block creation of another file or directory even when it consumes almost no data. A space quota accounts for replication, so a 10 GiB file at replication factor three can consume roughly 30 GiB of quota before protocol and block-layout details.

Storage-type quotas may also matter in heterogeneous clusters. Use the documented `-t` option and administrative quota commands for your Hadoop release. Change a quota only after confirming its owner and intended protection; a quota failure is not a disk-capacity defect.

## Verify Storage Policy and Placement Eligibility

Check the policy inherited by the target path:

```bash
hdfs storagepolicies -getStoragePolicy -path /data/target
hdfs storagepolicies -listPolicies
```

A `COLD` path requires `ARCHIVE` for new blocks because that policy has no creation fallback. SSD-oriented policies prefer their documented storage types and may fall back to `DISK`. Use `-listPolicies` to inspect each policy's creation and replication fallbacks; aggregate `-df` output alone does not show whether any policy-eligible type has room.

Placement also considers existing replica locations, rack awareness, upgrade domains where configured, service state, and client-excluded nodes. For a representative existing file in the same data set, inspect locations and topology:

```bash
hdfs fsck /data/target/example -files -blocks -locations -racks -storagepolicies
hdfs dfsadmin -printTopology
```

An aggregate 20 TB free could mean 200 GB on each of 100 nodes, yet no node has enough usable headroom for a large block plus safety checks. Or all free SSD space may be on a rack that cannot satisfy the next replica's diversity constraint.

Replication requirements matter too. A small cluster may have bytes free but too few eligible DataNodes to establish the requested pipeline. Inspect a representative replicated file's replication and the settings that govern new replicated files:

```bash
hdfs dfs -stat '%r %o %b %n' /data/target/example
hdfs getconf -confKey dfs.replication
hdfs getconf -confKey dfs.namenode.replication.min
```

The default and minimum are different concepts. Lowering the minimum can weaken durability and is not a capacity fix.

## Reconcile Apparent Usage Differences

Several commands legitimately answer different questions:

- `hdfs dfs -du` reports logical content usage and, with `-s`, a path summary; its displayed space consumed reflects replication where supported.
- `hdfs dfs -df` reports filesystem-level capacity and remaining space.
- `hdfs dfsadmin -report` shows the NameNode's cluster and DataNode accounting.
- local `df` reports the host filesystem, including non-HDFS consumers and its own allocation rules.

Snapshots can retain blocks after users delete or overwrite visible paths. Open files can hold under-construction blocks. Replication and erasure coding change physical consumption relative to logical file length. Checksums and DataNode metadata add local overhead. Non-HDFS files share the device. Small discrepancies are expected; large or growing discrepancies require investigation.

Use `hdfs dfs -du -h -s -x /data/target` when snapshot contents should be excluded from the path summary, and inspect snapshots explicitly before assuming a deletion released space.

## Perform a Controlled Write Probe

After read-only checks, test a small file in the exact target directory using the same user and configuration as the failing workload:

```bash
printf 'hdfs capacity probe\n' >/tmp/hdfs-capacity-probe.txt
hdfs dfs -put /tmp/hdfs-capacity-probe.txt /data/target/.capacity-probe
hdfs dfs -stat '%b bytes, replication %r' /data/target/.capacity-probe
hdfs dfs -rm /data/target/.capacity-probe
```

Coordinate this probe if writers watch the directory, and choose a designated diagnostic path when hidden files are unsafe. A tiny success proves namespace access and at least one block pipeline at that moment; it does not prove a large multi-block job will fit. If it fails, correlate the precise timestamp across client, NameNode, and selected DataNode logs.

## Official Documentation

- [HDFS Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [File System Shell Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html)
- [HDFS Architecture](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [HDFS DataNode Administration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDataNodeAdminGuide.html)
- [HDFS Storage Policies](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ArchivalStorage.html)
- [HDFS Default Configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)

## Conclusion

Free space is not a single truth in HDFS. The client sees an aggregate filesystem, the NameNode selects eligible replicas from reported DataNode capacity, and each DataNode ultimately depends on a real local filesystem. Reconcile those views, then check reserved space, failed volumes, quotas, storage types, replication, and topology. The right fix follows from the layer that rejected the write—not from the largest free-space number on the screen.
