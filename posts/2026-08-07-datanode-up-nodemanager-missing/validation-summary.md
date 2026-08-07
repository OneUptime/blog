# Validation Summary: DataNode Up, NodeManager Missing: HDFS and YARN Membership

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- Apache Hadoop YARN
- HDFS DataNode and NameNode
- YARN NodeManager and ResourceManager
- ResourceManager high availability
- Kerberos-secured Hadoop deployments
- Linux systemd, process, filesystem, and disk diagnostics

## Sources Consulted

- [Apache Hadoop YARN architecture](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YARN.html)
- [Apache Hadoop YARN NodeManager guide](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [Apache Hadoop YARN commands reference](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [Apache Hadoop YARN default configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [Apache Hadoop ResourceManager high availability guide](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceManagerHA.html)
- [Apache Hadoop graceful decommission guide](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/GracefulDecommission.html)
- [Apache Hadoop HDFS architecture guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [Apache Hadoop HDFS commands guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Apache Hadoop cluster setup guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/ClusterSetup.html)
- [Apache Hadoop 3.5.0 `DatanodeID` API](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs-client/build/source/hadoop-hdfs-project/hadoop-hdfs-client/target/api/org/apache/hadoop/hdfs/protocol/DatanodeID.html)

## Issues Found

- The `yarn envvars` example could be read as inspecting the already-running NodeManager. Clarified that it reports the computed environment for its own invocation and should be run under the same service account and launch environment.
- The post referred imprecisely to a top-level `workers` file. Corrected the documented location to `etc/hadoop/workers`; the file is consumed by helper scripts and is not Java daemon membership configuration.
- The disk-health threshold wording did not make clear that the minimum healthy fraction is evaluated for the configured local-directory and log-directory sets. Clarified the separate sets and described 90% precisely as the default maximum allowed per-disk utilization.
- The external health-script rule was stated as though only the beginning of the whole output mattered. Corrected it to say that any output line beginning with `ERROR` marks the node unhealthy; a nonzero exit status alone does not.
- The recovery checklist referred to a “new” NodeId, although a restarted NodeManager can retain the same NodeId when its hostname and port do not change. Changed this to “registered NodeId.”

## Review Notes

The current Apache documentation resolved to Hadoop 3.5.0 during validation. All seven documentation links in the post returned HTTP 200. The example systemd unit name and filesystem paths remain distribution- and deployment-specific, which the post already states or presents as examples. No deprecated Hadoop commands or configuration properties were found.
