# Validation Summary: How JournalNodes, ZKFC, and Fencing Stop HDFS Split Brain

## Status

validated

## Post Type

Technical operations guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- HDFS High Availability (HA)
- Quorum Journal Manager (QJM) and JournalNodes
- ZKFailoverController (ZKFC)
- Apache ZooKeeper 3.9
- HDFS fencing methods (`sshfence`, `shell`, and `powershell`)
- `hdfs haadmin` and `hdfs zkfc` command-line tools

## Sources Consulted

- [Apache Hadoop 3.5.0: HDFS High Availability Using the Quorum Journal Manager](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSHighAvailabilityWithQJM.html)
- [Apache Hadoop 3.5.0: HDFS Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Apache Hadoop 3.5.0 API: QJournalProtocol](https://hadoop.apache.org/docs/current3/hadoop-project-dist/hadoop-hdfs/build/source/hadoop-hdfs-project/hadoop-hdfs/target/api/org/apache/hadoop/hdfs/qjournal/protocol/QJournalProtocol.html)
- [Apache Hadoop 3.5.0 source: DFSHAAdmin](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/tools/DFSHAAdmin.java)
- [Apache Hadoop 3.5.0 source: ZKFailoverController](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-common-project/hadoop-common/src/main/java/org/apache/hadoop/ha/ZKFailoverController.java)
- [Apache Hadoop 3.5.0 source: SshFenceByTcpPort](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-common-project/hadoop-common/src/main/java/org/apache/hadoop/ha/SshFenceByTcpPort.java)
- [Apache ZooKeeper 3.9 overview](https://zookeeper.apache.org/doc/current/zookeeperOver.html)
- [Apache ZooKeeper 3.9 Programmer's Guide: ephemeral nodes and sessions](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html)

## Issues Found

- The post described a dead ZKFC only as degraded future failover readiness. That was incomplete for an active-side ZKFC: after its ZooKeeper session expires, the active election lock is deleted and another ZKFC can initiate failover and fence the still-running active. The text and failure table now distinguish active-side and standby-side ZKFC failures.
- The direct `transitionToActive` and `transitionToStandby` examples did not state that Hadoop rejects them when automatic failover is enabled unless the dangerous `--forcemanual` override is supplied. The post now documents that guard and clarifies that `hdfs haadmin -failover` delegates coordinated graceful failover to the target ZKFC when automatic failover is enabled.
- The `sshfence` configuration omitted its required passwordless SSH private-key setting. The example now includes `dfs.ha.fencing.ssh.private-key-files` and states the passwordless SSH requirement.
- The validation section presented `hdfs haadmin -checkHealth` without its documented limitation. The post now notes that, as of Hadoop 3.5.0, the command is not implemented as a comprehensive health check and normally fails only when the NameNode is completely down.

## Review Notes

The review used the current Apache Hadoop 3.5.0 and Apache ZooKeeper 3.9 documentation available on 2026-08-07. The QJM quorum URI, ZooKeeper and automatic-failover properties, fencing method names and ordering, shell-fencer variables and timeout behavior, `zkfc -formatZK` syntax, and `haadmin` command forms are current. The fencing script and SSH key paths are deployment-specific examples and must exist with suitable permissions and behavior in a real cluster. All external documentation links in the post resolve to the intended official Apache resources.
