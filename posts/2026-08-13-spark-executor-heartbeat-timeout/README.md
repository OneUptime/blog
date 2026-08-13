# Diagnose a Spark Executor Heartbeat Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Executors, Heartbeats, Garbage Collection, Networking, Troubleshooting

Description: Distinguish JVM pauses, driver overload, network loss, and oversized-task resource pressure behind Spark executor heartbeat timeouts before raising time limits.

---

Spark executor heartbeats tell the driver that an executor is alive and carry metrics for in-progress tasks. When the driver expires an executor after missing heartbeats, the message identifies a liveness symptom—not whether the executor was garbage-collection paused, disconnected, CPU-starved, already dying, or unable to get a timely response through an overloaded driver.

An oversized task can be the trigger without being the direct protocol cause: its working set may cause long stop-the-world garbage collection, container pressure, spill storms, or process starvation. A legitimate long-running task should still coexist with heartbeat traffic when the executor and network remain healthy.

## Preserve the Timeline Around the First Miss

Collect four time-aligned views before restarting repeatedly:

1. driver logs around the first missed heartbeat and executor removal;
2. executor logs, including JVM garbage-collection and fatal-error output;
3. cluster-manager events for container/pod/node termination and resource limits;
4. host network, CPU, memory, disk, and process metrics.

Determine whether the cluster manager killed the executor before the driver timed it out. An out-of-memory kill, node eviction, preemption, or pod deletion makes the later heartbeat timeout secondary. Conversely, an executor process that continues running after the driver removes it points toward communication or driver-side responsiveness.

The Spark UI Executors tab and retained event log show executor add/remove events, task counts, GC time, memory, and shuffle activity. The monitoring guide notes that executor-level metrics travel to the driver as part of the heartbeat. Missing recent metrics may therefore be another consequence of the broken heartbeat path.

## Check the Timeout Relationship

Spark documents two relevant settings:

- `spark.executor.heartbeatInterval` controls how often executors send heartbeats to the driver;
- `spark.network.timeout` supplies a default timeout for several network interactions when their specific settings are absent.

The configuration guide says the heartbeat interval should be significantly less than the network timeout. Inspect effective settings in the Environment tab; do not assume the application used the value in a stale configuration file.

```bash
spark-submit \
  --conf spark.executor.heartbeatInterval=10s \
  --conf spark.network.timeout=120s \
  job.py
```

These are illustrative values, not a tuning prescription. A larger timeout changes failure detection latency and can leave dead resources registered longer. A shorter heartbeat interval creates more driver traffic. Fix an invalid relationship, but do not use larger timeouts to conceal repeated multi-minute pauses or packet loss.

## Distinguish the Main Failure Classes

### JVM garbage-collection pause

Evidence includes a long gap in executor log timestamps aligned with a major/full GC pause, high task `jvmGCTime`, heap close to its limit, and recovery after the pause. Spark's tuning guide recommends collecting GC statistics and explains that object-heavy data structures and interference between task working memory and cached data can increase GC cost.

Reduce the cause: shrink per-task input, correct skew, remove unnecessary cache pressure, use more memory-efficient representations, and inspect excessive object creation. JVM collector flags depend on the supported JDK and Spark release; use the official runtime guidance for that environment rather than copying legacy flags.

### Network loss or isolation

Evidence includes connection timeouts/resets without a corresponding JVM pause, packet loss or retransmits, node/network-policy events, and failures affecting communications beyond heartbeats. Check whether one host, rack, availability zone, or driver path is common.

Do not infer “network” only because `spark.network.timeout` appears in the message. That setting governs detection; it does not identify the failed layer.

### Driver overload or long driver pause

A responsive executor cannot maintain a useful control channel if the driver is unresponsive. Look for driver GC pauses, CPU saturation, very large event-processing load, listener code doing blocking work, and a wave of executor timeouts at the same instant. If many unrelated executors expire together, a shared driver or network path is more plausible than simultaneous executor failures.

Spark's monitoring pipeline and custom listeners can themselves add driver work. Keep listener callbacks bounded and move slow external I/O out of synchronous event processing.

### Executor/container resource pressure

The JVM may be alive but the container can be constrained by Python workers, native memory, Arrow buffers, direct network buffers, or other overhead outside executor heap. Cluster-manager memory diagnostics and process/container metrics are essential. Increasing `spark.executor.memory` without accounting for overhead can leave the container limit unchanged or worse.

CPU throttling and disk saturation can also compound pauses. Compare executor run time with executor CPU time: a large gap can indicate waiting, GC, I/O, or descheduling, though it does not uniquely identify one.

## Find the Oversized or Skewed Task

Open the stage active when heartbeats stopped. Compare the timed-out executor's tasks with peers:

- input and shuffle-read bytes/records;
- task duration and executor CPU time;
- peak execution memory;
- memory/disk spill;
- JVM GC time;
- shuffle fetch wait and write time.

One extreme task suggests skew, a huge file split, a many-to-many join key, or a grouped operation with unbounded state. All tasks on one executor degrading together suggests host or executor pressure. All executors degrading together suggests a global stage shape, driver issue, or shared infrastructure.

Reduce task size through appropriate input/shuffle partitioning only when the distribution is broadly large. More partitions will not split one hot hash key by itself. Apply a semantic skew fix or an eligible AQE optimization for that case.

## Run One Controlled Recovery Test

After identifying a leading hypothesis, change the cause and keep timeouts fixed. Examples:

- reduce skew or per-task bytes for a GC hypothesis;
- remove an oversized cache for storage/execution contention;
- repair the affected node/network path;
- eliminate blocking driver listener work;
- size executor/container overhead for observed Python/native memory.

Rerun the same input and compare heartbeat stability, GC pauses, task outliers, executor removals, and overall runtime. Only then consider a timeout increase for known, acceptable pauses in an environment where slower failure detection is an explicit trade-off.

Do not raise both heartbeat interval and network timeout proportionally without reasoning. Less frequent heartbeats reduce evidence and can interact poorly with detection. Maintain the documented “significantly less” relationship.

## Official Documentation

- [Spark Configuration: Heartbeat and Network Timeouts](https://spark.apache.org/docs/latest/configuration.html)
- [Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)
- [Spark Web UI: Executor and Task Metrics](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark Tuning Guide: Garbage Collection](https://spark.apache.org/docs/latest/tuning.html#garbage-collection-tuning)
- [Spark Tuning Guide: Memory Management](https://spark.apache.org/docs/latest/tuning.html#memory-management-overview)
- [Spark Cluster Mode Overview](https://spark.apache.org/docs/latest/cluster-overview.html)
- [Spark Hardware Provisioning](https://spark.apache.org/docs/latest/hardware-provisioning.html)
- [Spark Job Scheduling](https://spark.apache.org/docs/latest/job-scheduling.html)

## Conclusion

A heartbeat timeout means the driver lost timely liveness evidence. Establish whether the executor had already died, the JVM paused, the network isolated it, or the driver could not process the control path. Use task distributions and cluster events to connect oversized work to GC or container pressure. Correct the responsible layer first; extend timeouts only for measured, acceptable latency with a deliberate slower-failure trade-off.
