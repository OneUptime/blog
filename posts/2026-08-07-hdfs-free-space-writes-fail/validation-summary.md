# Validation Summary: HDFS Has Free Space but Writes Still Fail

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- HDFS NameNode and DataNode administration
- HDFS capacity accounting, quotas, and reserved space
- HDFS storage policies, replication, and block placement
- Linux filesystem capacity, inode, and mount diagnostics

## Sources Consulted
- Apache Hadoop 3.5.0 HDFS Commands Guide — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html
- Apache Hadoop 3.5.0 File System Shell Guide — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html
- Apache Hadoop 3.5.0 HDFS Architecture — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html
- Apache Hadoop 3.5.0 HDFS DataNode Admin Guide — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDataNodeAdminGuide.html
- Apache Hadoop 3.5.0 HDFS Storage Policies — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ArchivalStorage.html
- Apache Hadoop 3.5.0 HDFS Quotas Guide — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsQuotaAdminGuide.html
- Apache Hadoop 3.5.0 Hadoop Metrics reference — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/Metrics.html
- Apache Hadoop 3.5.0 default HDFS configuration — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml
- Apache Hadoop 3.5.0 `BlockManager` source — https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/blockmanagement/BlockManager.java
- Apache Hadoop 3.5.0 `DatanodeInfo` source — https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/protocol/DatanodeInfo.java

## Issues Found

1. **Incorrect current exception wording:** Replaced “could only be replicated to 0 nodes” with the current Hadoop wording, “could only be written to 0 of the 1 minReplication nodes,” so the example matches the exception emitted by Hadoop 3.5.0 with the default minimum replication setting.

2. **Misattributed failed-volume detail:** The text implied that `hdfs dfsadmin -report` displays a failed-volume count for each DataNode. Its per-node report includes capacity, usage, service state, and contact information, but not a per-node failed-volume count. Clarified that the failed-volume total comes from NameNode metrics and that affected DataNode logs identify volume failures.

3. **Incorrect `COLD` storage-policy fallback implication:** The text could be read as saying that a `COLD` path can fall back from `ARCHIVE` to `DISK` during file creation. Hadoop's `COLD` policy has no creation or replication fallback. Clarified that `COLD` requires `ARCHIVE` for new blocks, while SSD-oriented policies can fall back to `DISK`.

4. **Incorrect directory replication implication:** Replication factor is a file property; a directory does not carry an inherited replication factor for newly created files. Changed the guidance to inspect a representative replicated file and the configuration settings governing new replicated files.

## Review Notes
- Validation was performed against Apache Hadoop 3.5.0, the version served by the official `current` documentation at review time.
- The remaining shell commands, configuration keys, XML snippet, quota accounting, reserved-space calculators, storage-policy commands, snapshot-exclusion behavior, and placement explanations are technically correct for Hadoop 3.5.0.
- The replication checks apply to replicated files. Erasure-coded files use their erasure-coding policy and placement requirements instead of a meaningful replication factor.
