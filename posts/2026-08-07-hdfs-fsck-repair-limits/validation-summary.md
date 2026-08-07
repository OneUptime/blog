# Validation Summary: What `hdfs fsck` Can and Cannot Repair

## Status

validated

## Post Type

Technical troubleshooting and data-recovery guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- `hdfs fsck` and `hdfs dfsadmin`
- HDFS block replication, placement policies, and erasure coding
- NameNode and DataNode recovery behavior
- HDFS snapshots, safe mode, storage policies, and metadata recovery

## Sources Consulted

- [Apache Hadoop 3.5.0 HDFS Commands Guide: `fsck`](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html#fsck)
- [Apache Hadoop 3.5.0 HDFS Users Guide: safe mode, `fsck`, recovery mode, and DataNode hot swap](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html)
- [Apache Hadoop 3.5.0 HDFS Architecture: replication, block reports, safe mode, re-replication, checksums, and metadata](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [Apache Hadoop 3.5.0 HDFS Erasure Coding](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Apache Hadoop 3.5.0 HDFS Snapshots](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HdfsSnapshots.html)
- [Apache Hadoop 3.5.0 Archival Storage and storage policies](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/ArchivalStorage.html)
- [Apache Hadoop 3.5.0 Rack Awareness](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-common/RackAwareness.html)
- [Apache Hadoop 3.5.0 DataNode Administration](https://hadoop.apache.org/docs/r3.5.0/hadoop-project-dist/hadoop-hdfs/HdfsDataNodeAdminGuide.html)
- [Apache Hadoop 3.5.0 `DFSck` client source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/tools/DFSck.java)
- [Apache Hadoop 3.5.0 `NamenodeFsck` implementation](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/namenode/NamenodeFsck.java)
- [Apache Hadoop 3.5.0 `BlockManager` implementation](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/blockmanagement/BlockManager.java)
- [Apache Hadoop 3.5.0 `TestFsck` regression tests](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/test/java/org/apache/hadoop/hdfs/server/namenode/TestFsck.java)

## Issues Found

- The `-move` section said corrupt files were removed from the production path and applications would stop finding the original path. Hadoop 3.5.0's implementation copies readable block chains to `/lost+found/<original-path>/`, and its regression test explicitly verifies that the corrupt original still exists. Changed the section to describe `-move` as salvage rather than containment, corrected the operational checklist, and made clear that separate isolation, deletion, or replacement is required.
- The recovery rule assumed all HDFS files use replication. Current HDFS also supports erasure-coded block groups, whose missing internal blocks can be reconstructed from sufficient surviving data and parity inputs without an identical replica. Added narrowly scoped erasure-coding qualifications to the architecture, automatic-recovery, `-replicate`, damage-class, and conclusion text.
- The `-replicate` explanation characterized the option only as topology correction. Hadoop passes placement-policy violations to `BlockManager.processMisReplicatedBlocks`; if such a block also needs reconstruction, it can be added to the low-redundancy queue. Corrected the explanation while preserving the key point that the option cannot recreate unrecoverable content.
- The under-replicated and missing-block definitions were too broad. Clarified that `fsck` counts and reports out-of-service replica states separately, and that a replicated block with all available replicas marked corrupt is reported as corrupt rather than merely missing.
- The verification section said HDFS confirms that replicas agree with each other. HDFS clients validate readable data against stored checksums, while `fsck` reports block state; neither result proves application-level correctness. Reworded the claim accordingly.

## Review Notes

- All shown command names and flags are valid in Apache Hadoop 3.5.0. This includes `-replicate`, `-includeSnapshots`, `-list-corruptfileblocks`, and the combined `-files -blocks -locations -replicaDetails` diagnostic command.
- `-replicate` is version-sensitive and is not present in the Hadoop 2.10.2 `fsck` command set. Operators on older Hadoop releases should check their installed `hdfs fsck` help before using it.
- The Hadoop 3.5.0 commands guide still summarizes `-move` as “Move corrupted files to /lost+found,” but the release implementation and tests establish the more precise copy-and-retain behavior documented in the corrected post.
- The four official documentation links in the original post returned HTTP 200 and pointed to the intended current Apache Hadoop sections. An official erasure-coding architecture link was added to support the corrected scope.
