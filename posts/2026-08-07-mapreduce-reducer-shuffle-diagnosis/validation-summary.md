# Validation Summary: MapReduce Reducers Stuck in Shuffle: A Diagnostic Runbook

## Status

validated

## Post Type

Diagnostic runbook / troubleshooting guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop MapReduce shuffle, sort, spill, merge, partitioning, combiners, counters, and task attempts
- Apache Hadoop YARN, NodeManager, ApplicationMaster, and JobHistory Server
- Hadoop `yarn` and `mapred` command-line tools
- Hadoop XML configuration and Snappy map-output compression

## Sources Consulted

- [Apache Hadoop 3.5.0 MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [Apache Hadoop MapReduce default configuration (`mapred-default.xml`)](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)
- [Apache Hadoop 3.5.0 MapReduce Commands Guide](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapredCommands.html)
- [Apache Hadoop 3.5.0 YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [Apache Hadoop 3.5.0 `Reducer` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/Reducer.html)
- [Apache Hadoop 3.5.0 `TaskCounter` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/TaskCounter.html)
- [Apache Hadoop 3.5.0 pluggable shuffle and sort documentation](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/PluggableShuffleAndPluggableSort.html)
- [Apache Hadoop 3.5.0 NodeManager documentation](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [Apache Hadoop YARN default configuration (`yarn-default.xml`)](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [Apache Hadoop encrypted shuffle documentation](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/EncryptedShuffle.html)
- [Apache Hadoop 3.5.0 `HashPartitioner` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-mapreduce-project/hadoop-mapreduce-client/hadoop-mapreduce-client-core/src/main/java/org/apache/hadoop/mapreduce/lib/partition/HashPartitioner.java)
- [Apache Hadoop 3.5.0 `SnappyCodec` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-common-project/hadoop-common/src/main/java/org/apache/hadoop/io/compress/SnappyCodec.java)

## Issues Found

- The introduction listed four bottlenecks even though the runbook separately diagnoses an unfinished or delayed map. Changed the count to five and included a map delay so the stated failure taxonomy matches the diagnostic cases.
- The map-straggler checklist said a map could be waiting for a speculative attempt to finish. MapReduce accepts whichever eligible attempt succeeds; it does not require the speculative copy specifically. Changed this to waiting for either the original or a speculative attempt to succeed.
- The shuffle-retry discussion could imply that restart retry is enabled independently. In Hadoop 3.5.0, `mapreduce.reduce.shuffle.fetch.retry.enabled` defaults to `${yarn.nodemanager.recovery.enabled}`, while NodeManager recovery defaults to `false`. Clarified that relationship and default.
- The skew examples referred to a null key. The default `HashPartitioner` calls `key.hashCode()`, so a literal Java `null` key is invalid rather than a normal skew key. Changed the wording to “null sentinel,” which accurately describes a valid key value representing missing data.

## Review Notes

- Verified the documented current defaults: `mapreduce.job.reduce.slowstart.completedmaps=0.05`, `mapreduce.reduce.shuffle.parallelcopies=5`, both shuffle timeouts at `180000` ms, `mapreduce.task.io.sort.mb=100`, `mapreduce.map.sort.spill.percent=0.80`, `mapreduce.reduce.shuffle.input.buffer.percent=0.70`, `mapreduce.reduce.shuffle.merge.percent=0.66`, and `mapreduce.task.io.sort.factor=10`.
- Verified all listed framework counters, all three CLI command forms, the XML property names, the `SnappyCodec` class name, the reducer phase description, and all five external links in the post.
- The Apache `current` documentation resolved to Hadoop 3.5.0 for the main MapReduce, API, YARN, and configuration references at review time. The encrypted-shuffle page at that path identified itself as 3.4.3, but the HTTPS/TLS behavior cited by the post remains applicable.
