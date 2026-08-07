# MapReduce Reducers Stuck in Shuffle: A Diagnostic Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, MapReduce, Shuffle, YARN, Performance, Troubleshooting

Description: Separate key skew, map spill, reducer merge, and failed shuffle fetches when MapReduce reducers appear stuck before reduce code runs.

---

A reducer that spends a long time in “shuffle” is not necessarily stuck. Each reducer must fetch its partition from every successful mapper, merge those segments, sort and group the keys, and only then run most of the user reducer logic. One slow map, one unreachable NodeManager, thousands of spill files, or one oversized partition can hold up that pipeline.

Diagnose the phase with attempt timelines, counters, and logs before increasing reducer memory or parallel copies. The same progress symptom can come from four very different bottlenecks: skew, spill, merge, or fetch.

## What the shuffle is waiting for

Map outputs are partitioned by reducer, sorted, and written to local storage on each mapper's node. Reducers fetch their assigned partition over HTTP from the NodeManager shuffle service. The data is not first persisted to HDFS.

The reducer has three framework phases:

1. **Shuffle:** fetch the reducer's partition from completed map attempts.
2. **Sort and merge:** combine in-memory and on-disk segments and group equal keys.
3. **Reduce:** call user code for each grouped key.

Shuffle and merge overlap. Reducers may start after only a fraction of maps have completed, controlled by `mapreduce.job.reduce.slowstart.completedmaps`. In the current Apache defaults, that fraction is `0.05`. A reducer launched early can therefore show low copy progress while most maps are still legitimately running.

Ask this first: are maps still producing data, are fetches repeatedly failing, or has one reducer received far more bytes than its peers?

## Establish the failure shape

Open the MapReduce JobHistory or live ApplicationMaster UI and compare **all reducer attempts**, not just the slowest one. Record:

- shuffle finish, sort finish, and task finish times;
- shuffled bytes and records per reducer;
- failed and killed attempts;
- the number and identity of maps not yet copied;
- hostnames for slow reducers and source map attempts;
- reducer logs around fetch, merge, GC, and local-disk errors.

Useful framework counters include:

```text
Map-Reduce Framework
  Map output bytes
  Map output materialized bytes
  Map output records
  Reduce shuffle bytes
  Shuffled Maps
  Failed Shuffles
  Merged Map outputs
  Spilled Records
  Combine input records
  Combine output records
```

Interpret them comparatively. If one reducer receives 400 GiB while nineteen receive 20 GiB, that is partition skew. If all reducers show many failed shuffles from the same host, investigate that NodeManager or its network path. If `Spilled Records` is many times larger than the logical record counts, repeated spill and merge passes are probably adding substantial disk I/O.

## Case 1: a map has not finished

A reducer cannot fetch output that a mapper has not successfully produced. In the UI, find unfinished maps and check whether they are:

- processing an unusually large or unsplittable input;
- repeatedly failing and retrying;
- blocked on HDFS or an external system;
- running on a slow or unhealthy node;
- handling a pathological record;
- waiting for a speculative attempt to finish.

Do not tune reducer shuffle settings to fix a map straggler. Compare that map's input bytes, input records, CPU time, GC time, and task logs with its peers. Correct input splitting, the mapper, or the node-level fault.

If all maps have completed but the reducer has not copied them all, move to fetch failures.

## Case 2: shuffle fetches are failing

Search the reducer attempt log for source hosts and messages such as connection timeout, read timeout, connection reset, fetch failure, checksum error, or “too many fetch failures.” Then inspect the corresponding NodeManager and local disks.

```bash
# Identify unhealthy or lost YARN nodes.
yarn node -list -all

# Inspect one source node as reported by YARN.
yarn node -status worker-22.example.net:8041

# Review the job and attempt links in the ResourceManager / JobHistory UI.
mapred job -status job_1786100000000_0042
```

The exact log retrieval command depends on whether the application is still live and whether aggregation is enabled. Use the YARN application UI or your supported `yarn logs` workflow to retrieve the reducer and NodeManager diagnostics.

Common fetch causes are:

- a NodeManager restart removed or temporarily hid local map output;
- the shuffle service is missing, stopped, or misconfigured;
- a local disk is full, failed, or too slow to serve segments;
- a firewall or network policy blocks the shuffle port;
- DNS or hostname resolution differs between nodes;
- TLS or encrypted-shuffle settings disagree;
- the source node is overloaded by concurrent fetches.

Current Apache defaults include five reducer-side parallel copies, 180-second connect and read timeouts, and retry controls for recoverable NodeManager restarts. These values are diagnostics, not universal tuning targets. Raising timeouts can make a broken path fail more slowly; raising parallel copies can overload the same source disks and network.

## Case 3: partitions are skewed

The default hash partitioner sends every instance of the same map-output key to one reducer. Adding reducers improves parallelism only when there are enough distinct, reasonably distributed keys. It cannot split one hot key across reducers without changing the algorithm.

Confirm skew by ranking reducer shuffle bytes, input records, and elapsed time. Also sample map-output keys using a representative dataset. Causes include:

- a null, empty, default, or “unknown” key used by a large fraction of records;
- a naturally hot customer, tenant, date, or country;
- a custom partitioner that uses too little of the key;
- keys whose `hashCode`, equality, grouping comparator, and serialization disagree;
- one reducer receiving many more compressed or expanded values than peers.

Choose a semantic fix:

- correct accidental default keys;
- use a well-distributed partition key;
- pre-aggregate with a valid combiner;
- salt a hot key into multiple intermediate keys, then run a second aggregation stage;
- use range partitioning based on a representative sample;
- split known heavy tenants into a separate job.

A combiner is safe only when the operation supports arbitrary repeated local aggregation. Summation is a classic fit; a naive arithmetic average is not unless it carries both sum and count.

## Case 4: map-side spill is excessive

Map output is serialized into an in-memory sort buffer and spilled to local disk when it crosses a threshold. Multiple spill files are merged before the output is served. In current Apache defaults:

```xml
<property>
  <name>mapreduce.task.io.sort.mb</name>
  <value>100</value>
</property>
<property>
  <name>mapreduce.map.sort.spill.percent</name>
  <value>0.80</value>
</property>
```

Evidence of map-side pressure includes high `Spilled Records`, many spill messages in map logs, high local-disk utilization, and a large gap between map CPU completion and attempt completion.

Reduce data before making buffers larger:

```xml
<property>
  <name>mapreduce.map.output.compress</name>
  <value>true</value>
</property>
<property>
  <name>mapreduce.map.output.compress.codec</name>
  <value>org.apache.hadoop.io.compress.SnappyCodec</value>
</property>
```

Confirm that the codec is available on every worker. Map-output compression trades CPU for less disk and network I/O, so benchmark it with production-shaped data. A combiner can reduce records and bytes even more when its semantics are valid.

Increase `mapreduce.task.io.sort.mb` only if the map container heap has room. The sort buffer lives within task memory; making it too large can increase garbage collection or cause container failure.

## Case 5: reducer merge is the bottleneck

Fetched outputs use a portion of reducer heap, with larger or excess segments written to disk and merged. Relevant current properties include:

```xml
<property>
  <name>mapreduce.reduce.shuffle.input.buffer.percent</name>
  <value>0.70</value>
</property>
<property>
  <name>mapreduce.reduce.shuffle.merge.percent</name>
  <value>0.66</value>
</property>
<property>
  <name>mapreduce.task.io.sort.factor</name>
  <value>10</value>
</property>
```

The first two control how reducer heap is used for fetched map output and when an in-memory merge starts. The sort factor controls how many streams are merged at once. More streams can reduce merge passes but increase open files, memory use, and concurrent I/O.

Look for long merge periods, high local-disk queue depth, repeated GC pauses, file-descriptor errors, and insufficient local space. Validate that YARN container memory, reducer Java heap, native overhead, shuffle buffers, and local disk capacity are consistent. Change one setting at a time; several individually reasonable percentages can collectively exhaust the reducer.

## A disciplined tuning loop

Use a repeatable workload and capture a baseline:

1. Per-reducer shuffle bytes and duration distribution.
2. Map output bytes, materialized bytes, and spilled records.
3. Failed shuffle count grouped by source host.
4. Local-disk throughput, latency, space, and file descriptors.
5. Network throughput and retransmits by rack and host.
6. Task heap, GC time, and container memory failures.
7. Map completion curve and reducer slow-start time.

Fix correctness and infrastructure faults first. Then address skew and reduce intermediate data. Tune buffer, merge, and parallel-copy settings last, in a staging queue with the same container sizing and data distribution.

## Official Documentation

- [Apache Hadoop MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [Apache Hadoop MapReduce Default Configuration](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)
- [Apache Hadoop `TaskCounter` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/TaskCounter.html)
- [Apache Hadoop `Reducer` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/Reducer.html)
- [Apache Hadoop YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)

## Conclusion

“Stuck in shuffle” describes a pipeline stage, not a root cause. First determine whether reducers are waiting for maps, retrying a source host, processing an oversized partition, or performing excessive spill and merge I/O. Counters and per-attempt timelines separate those cases quickly. Reduce skew and intermediate data before tuning buffers; otherwise configuration changes merely move the bottleneck between heap, disk, and network.
