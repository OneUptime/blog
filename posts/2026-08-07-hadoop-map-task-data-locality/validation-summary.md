# Validation Summary: Why Map Tasks Read Remote HDFS Blocks

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Hadoop MapReduce
- Apache Hadoop YARN
- Hadoop Distributed File System (HDFS)
- MapReduce `InputFormat`, `InputSplit`, and file input formats
- MapReduce job counters and JobHistory
- YARN Capacity Scheduler, Fair Scheduler, node labels, and NodeManagers
- HDFS replication, erasure coding, block placement, and rack awareness
- Hadoop command-line tools: `mapred`, `hdfs`, and `yarn`

## Sources Consulted
- Apache Hadoop MapReduce Tutorial: https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html
- Apache Hadoop MapReduce Commands Guide: https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapredCommands.html
- Apache Hadoop `InputSplit` API: https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/InputSplit.html
- Apache Hadoop `FileInputFormat` API: https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/FileInputFormat.html
- Apache Hadoop `CombineFileInputFormat` API: https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/CombineFileInputFormat.html
- Apache Hadoop `JobCounter` API: https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/JobCounter.html
- Apache Hadoop YARN Commands: https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html
- Apache Hadoop YARN Node Labels: https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeLabel.html
- Apache Hadoop Capacity Scheduler: https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/CapacityScheduler.html
- Apache Hadoop Fair Scheduler: https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/FairScheduler.html
- Apache Hadoop HDFS Commands Guide: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html
- Apache Hadoop File System Shell Guide: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html
- Apache Hadoop Rack Awareness: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/RackAwareness.html
- Apache Hadoop HDFS Architecture: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html
- Apache Hadoop MapReduce source, `RMContainerAllocator`: https://github.com/apache/hadoop/blob/trunk/hadoop-mapreduce-project/hadoop-mapreduce-client/hadoop-mapreduce-client-app/src/main/java/org/apache/hadoop/mapreduce/v2/app/rm/RMContainerAllocator.java
- Apache Hadoop MapReduce source, `TaskAttemptImpl`: https://github.com/apache/hadoop/blob/trunk/hadoop-mapreduce-project/hadoop-mapreduce-client/hadoop-mapreduce-client-app/src/main/java/org/apache/hadoop/mapreduce/v2/app/job/impl/TaskAttemptImpl.java

## Issues Found
- The introduction equated remote HDFS reads directly with YARN's placement of a map attempt relative to an entire split. MapReduce locality counters classify a container against the split's reported location hints, while actual HDFS reads occur block by block and can differ for combined, oversized, or unsplittable splits. Updated the introduction and conclusion to distinguish attempt placement from byte-level remote I/O.
- The `InputSplit` explanation described its locations as hosts where its bytes are available. `InputSplit` is a general logical abstraction and `getLocations()` returns locality hints for where the split's input would be local. Updated the wording to match the API contract.
- The rack-local and off-switch descriptions implied direct knowledge of the hosts serving every byte. Updated them to describe classification against hosts and racks reported for the split, and clarified that off-switch HDFS placement normally requires non-local reads.
- The off-switch formula could be mistaken for the fraction of bytes read remotely. Clarified that it measures the ratio of off-switch attempt placements.
- The replication-factor-one explanation said the scheduler has one node-local option without limiting the claim to a block. Combined splits can expose multiple locations even when each block has one replica. Changed the claim to the accurate per-block statement.
- The `hdfs dfs -setrep` example did not mention erasure-coded files. Current Hadoop documentation states that `setrep` ignores erasure-coded files, so the example is now explicitly scoped to replicated files and includes that caveat.

## Review Notes
- All shown command forms and flags are valid in current Apache Hadoop: `mapred job -counter`, `hdfs fsck -files -blocks -locations`, `hdfs dfsadmin -report`, `hdfs dfs -ls -h`, `hdfs dfs -setrep -w`, `yarn node -list -all`, `yarn node -status`, `yarn cluster --list-node-labels`, and `yarn node -list -showDetails`.
- `yarn node -list -showDetails` is implemented in current Hadoop and is used by official Hadoop documentation, although the option is omitted from the current YARN Commands table. Older Hadoop releases before its introduction do not support it.
- The counter enum names and counter-group name used by the CLI examples are correct. `TOTAL_LAUNCHED_MAPS` includes launched attempts, so retries and speculative attempts can make it exceed the number of logical map tasks, as the post states.
- Capacity Scheduler and Fair Scheduler both provide locality-delay controls, but use different configuration mechanisms. The post correctly advises identifying the active scheduler before tuning.
- Every external link in the post returned a successful HTTP response and points to the intended current Apache Hadoop documentation.
