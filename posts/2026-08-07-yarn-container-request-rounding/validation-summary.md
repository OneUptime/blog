# Validation Summary: How YARN Rounds Container Requests

## Status
validated

## Post Type
Technical guide and capacity-planning reference

## Technologies Covered

- Apache Hadoop 3.5.0
- Apache YARN
- YARN ResourceManager and NodeManager
- Fair Scheduler
- Capacity Scheduler
- MapReduce on YARN
- YARN command-line tools and REST APIs

## Sources Consulted

- [Apache Hadoop 3.5.0: YARN Resource Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceModel.html)
- [Apache Hadoop 3.5.0: YARN Default Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [Apache Hadoop 3.5.0: Fair Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/FairScheduler.html)
- [Apache Hadoop 3.5.0: Capacity Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/CapacityScheduler.html)
- [Apache Hadoop 3.5.0: YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [Apache Hadoop 3.5.0: MapReduce Default Configuration](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)
- [Apache Hadoop 3.5.0: `InvalidResourceRequestException` API](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-api/apidocs/org/apache/hadoop/yarn/exceptions/InvalidResourceRequestException.html)
- [Apache Hadoop 3.5.0 source: `SchedulerUtils`](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-yarn-project/hadoop-yarn/hadoop-yarn-server/hadoop-yarn-server-resourcemanager/src/main/java/org/apache/hadoop/yarn/server/resourcemanager/scheduler/SchedulerUtils.java)
- [Apache Hadoop 3.5.0 source: `AbstractYarnScheduler`](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-yarn-project/hadoop-yarn/hadoop-yarn-server/hadoop-yarn-server-resourcemanager/src/main/java/org/apache/hadoop/yarn/server/resourcemanager/scheduler/AbstractYarnScheduler.java)
- [Apache Hadoop 3.5.0 source: `ClusterNodeTracker`](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-yarn-project/hadoop-yarn/hadoop-yarn-server/hadoop-yarn-server-resourcemanager/src/main/java/org/apache/hadoop/yarn/server/resourcemanager/scheduler/ClusterNodeTracker.java)

## Issues Found

- The node-fragmentation example stated that requested vCores always limit per-node container concurrency and that YARN always schedules all resource-vector dimensions. This is not true for every scheduler configuration: Capacity Scheduler's default `DefaultResourceCalculator` uses only memory for resource comparisons, while `DominantResourceCalculator` performs multidimensional comparisons. The example and the later NodeManager-placement statement were qualified to make CPU and other resource dimensions dependent on the active scheduler policy or resource calculator.

## Review Notes

- The post's reference defaults and current/preferred MapReduce and Fair Scheduler property names match Apache Hadoop 3.5.0 documentation as published on the validation date.
- The rounding formula is correctly scoped to the stated minimum, maximum, and increment values. Implementations also cap the rounded result at the applicable maximum; with the post's 8192 MiB maximum and 1024 MiB increment, the maximum is increment-aligned.
- Both YARN CLI commands use current documented syntax.
- All external links in the post returned successful HTTP responses during validation.
