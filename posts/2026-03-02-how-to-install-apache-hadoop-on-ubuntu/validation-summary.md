# Validation Summary: How to Install Apache Hadoop on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 22.04
- Apache Hadoop 3.3.6
- HDFS
- YARN
- MapReduce
- OpenJDK 11
- SSH

## Sources Consulted
- Apache Hadoop 3.3.6 Single Node Cluster setup: https://hadoop.apache.org/docs/r3.3.6/hadoop-project-dist/hadoop-common/SingleCluster.html
- Apache Hadoop Java Versions: https://cwiki.apache.org/confluence/display/HADOOP/Hadoop%2BJava%2BVersions
- Apache Hadoop 3.3.6 FileSystem Shell guide: https://hadoop.apache.org/docs/r3.3.6/hadoop-project-dist/hadoop-common/FileSystemShell.html
- Apache Hadoop 3.3.6 HDFS Commands guide: https://hadoop.apache.org/docs/r3.3.6/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html
- Apache Hadoop releases page: https://hadoop.apache.org/release/
- Apache Hadoop 3.3.6 download directory: https://downloads.apache.org/hadoop/common/hadoop-3.3.6/

## Issues Found
- The Java prerequisite said "Java 11 recommended for Hadoop 3.x", which is too broad because current Hadoop 3.5 requires JDK 17 on the server side. Changed it to "Hadoop 3.3.x" to match the version used in the tutorial.
- The installation commands did not install SSH/sshd even though Hadoop's start and stop scripts require SSH to manage daemons. Added `ssh` and `pdsh` to the package installation command, matching the official single-node setup prerequisites.
- The Hadoop environment variables omitted component-specific homes used by the official YARN MapReduce classpath example. Added `HADOOP_COMMON_HOME`, `HADOOP_HDFS_HOME`, `HADOOP_MAPRED_HOME`, and `HADOOP_YARN_HOME`.
- The YARN configuration omitted `yarn.nodemanager.env-whitelist`, which the official Hadoop 3.3.6 single-node YARN setup includes so NodeManager-launched containers receive the necessary environment variables. Added the property.
- The MapReduce configuration omitted `mapreduce.application.classpath`, which the official Hadoop 3.3.6 single-node YARN setup includes for MapReduce jobs running on YARN. Added the property.

## Review Notes
The tutorial intentionally uses Hadoop 3.3.6, which remains available from Apache's download directory, but Apache lists Hadoop 3.5.0 as the current stable release as of this validation date. Updating the tutorial to Hadoop 3.5.x in the future would also require updating the Java prerequisite to JDK 17.
