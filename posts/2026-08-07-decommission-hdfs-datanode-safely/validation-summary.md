# Validation Summary: Decommission an HDFS DataNode Safely

## Status
validated

## Post Type
Operations guide

## Technologies Covered
- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- HDFS NameNode and DataNode administration
- HDFS high availability and federation
- HDFS storage policies, rack awareness, and upgrade domains

## Sources Consulted
- [Apache Hadoop 3.5.0 HDFS DataNode Admin Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDataNodeAdminGuide.html)
- [Apache Hadoop 3.5.0 HDFS Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Apache Hadoop 3.5.0 HDFS Users Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html)
- [Apache Hadoop 3.5.0 HDFS Federation Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/Federation.html)
- [Apache Hadoop 3.5.0 default HDFS configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)
- [Apache Hadoop 3.5.0 Metrics reference](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/Metrics.html)
- [Apache Hadoop 3.5.0 storage types and policies](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ArchivalStorage.html)
- [Apache Hadoop 3.5.0 upgrade-domain guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUpgradeDomain.html)
- [Apache Hadoop 3.5.0 `DFSAdmin` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/tools/DFSAdmin.java)
- [Apache Hadoop 3.5.0 `DatanodeAdminManager` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/blockmanagement/DatanodeAdminManager.java)
- [Apache Hadoop 3.5.0 `DatanodeManager` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/blockmanagement/DatanodeManager.java)

## Issues Found
- The introduction described the safety transition without limiting it to a live DataNode. Current Hadoop handles an already-dead node differently, so the explanation now explicitly applies to a live DataNode, which is also the safe workflow used throughout the post.
- The capacity guidance implied that `dfsadmin -report` could determine expected replica movement. Its per-node `DFS Used` figure is only a rough capacity input; the post now avoids presenting it as an exact movement forecast.
- The host-file discovery commands did not identify the configured host provider. The post now checks `dfs.namenode.hosts.provider.classname` and explains that the default `HostFileManager` uses both host files while `CombinedHostFileManager` reads only the JSON file named by `dfs.hosts`.
- The HA instructions said to deploy the host file only to the active NameNode and confirm only that node. The post now requires consistent deployment to every NameNode and accurately notes that `-refreshNodes`, when invoked through a logical HA URI, contacts every NameNode in that nameservice.
- The stuck-decommission list treated a requested replication factor greater than the eligible node count as an unconditional blocker. Hadoop can complete decommission when its implementation-specific sufficiency threshold is met even if a higher per-file replication factor remains under-satisfied, so the cause now refers to the actual decommission-sufficiency threshold.
- The completion checklist implied that a decommissioned DataNode would no longer serve reads. HDFS excludes it from new replica placement, but a live decommissioned node can remain a last-resort read source; the checklist now asks whether applications can tolerate losing the node.
- The storage-capacity example incorrectly claimed that insufficient SSD capacity could not fall back to DISK. The built-in `ALL_SSD` policy permits DISK as a replication fallback. The example now uses `COLD`, whose `ARCHIVE` placement has no replication fallback, and the surrounding checks account for permitted fallbacks.
- The capacity example mixed “usable” and “raw” capacity terminology. It now consistently uses configured capacity before separately accounting for reserved space and storage types.

## Review Notes
The post is validated against Apache Hadoop 3.5.0, which the `current` documentation URLs resolved to on the validation date. The CLI syntax, JSON field names and admin-state values, metrics, federation behavior, and experimental backing-off monitor description are current. The administrative commands require appropriate HDFS privileges. Operators on older Hadoop releases should verify that maintenance state and `CombinedHostFileManager` are available in their deployed version. No live HDFS cluster was present in the repository, so commands were checked against the official command reference and Apache source rather than executed against a cluster.
