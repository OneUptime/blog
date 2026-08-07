# Validation Summary: Why the HDFS Balancer Moves Nothing

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- HDFS Balancer and balancing policies
- HDFS Mover and Storage Policy Satisfier (SPS)
- HDFS storage policies and storage types
- HDFS Disk Balancer
- HDFS block pinning, snapshots, and upgrades
- HDFS administration and diagnostic commands

## Sources Consulted
- [Apache Hadoop 3.5.0 HDFS Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Apache Hadoop 3.5.0 HDFS Users Guide: Balancer](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html#Balancer)
- [Apache Hadoop 3.5.0 HDFS Disk Balancer](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSDiskbalancer.html)
- [Apache Hadoop 3.5.0 Archival Storage, SSD & Memory](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ArchivalStorage.html)
- [Apache Hadoop 3.5.0 HDFS Snapshots](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsSnapshots.html)
- [Apache Hadoop 3.5.0 default HDFS configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)
- [Apache Hadoop 3.5.0 `BalancingPolicy` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/balancer/BalancingPolicy.java)
- [Apache Hadoop 3.5.0 `Dispatcher` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/balancer/Dispatcher.java)
- [Apache Hadoop 3.5.0 `DatanodeInfo` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/protocol/DatanodeInfo.java)
- [Apache Hadoop 3.5.0 `GetConf` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/tools/GetConf.java)

## Issues Found
- The comparison between `datanode` and `blockpool` policy described the former as DataNode-wide aggregate balancing without retaining the storage-type qualifier. The text now states that the aggregate is evaluated for each storage type, matching `BalancingPolicy`.
- The post said that `hdfs dfsadmin -report` supplied both per-DataNode and per-storage-type utilization. Its standard DataNode entries are aggregate-only, and the displayed `DFS Used%` does not represent the exact utilization calculation used by the `datanode` policy when other occupied space is present. The text now directs readers to calculate from configured capacity and remaining space and to obtain separate per-storage-type metrics from monitoring or APIs in mixed-storage clusters.
- The configuration check used `hdfs getconf -namenodes` while describing NameNode addresses. That option prints NameNode hostnames without ports; it was replaced with `hdfs getconf -nnRpcAddresses`, which prints the configured RPC host-and-port addresses.
- The legal-destination list implied that Balancer directly evaluates a file's storage policy. Balancer preserves the replica's storage type during a move; storage-policy compliance is handled by SPS or Mover. The list now states the direct storage-type constraint.
- The storage-policy example placed `-satisfyStoragePolicy` and `hdfs mover` in one command sequence even though external SPS and Mover cannot run simultaneously. The example now presents them as alternatives and states the required SPS state for each path.

## Review Notes
Validation was performed against the current Apache Hadoop 3.5.0 documentation and matching release source. The runtime value set by `hdfs dfsadmin -setBalancerBandwidth` is not persistent on DataNodes; operators who need it after restart should also manage the corresponding configuration. Older Hadoop releases can differ in SPS and Disk Balancer availability or defaults, so their matching release documentation should be consulted.
