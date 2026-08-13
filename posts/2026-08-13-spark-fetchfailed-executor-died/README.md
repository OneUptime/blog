# Diagnose `FetchFailedException` After a Spark Executor Dies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Shuffle, FetchFailedException, Executors, Performance Tuning, Troubleshooting

Description: Trace Spark shuffle fetch failures to lost executors, transient networks, bad disks, or an unhealthy external shuffle service before changing retry settings.

---

A `FetchFailedException` tells you where a Spark stage noticed damage, not necessarily where the damage began. A reduce task asked for a shuffle block and could not retrieve it. The producer executor may already be gone, its local file may be missing or corrupt, the shuffle service may be unavailable, or a healthy server may simply be unreachable long enough to exhaust the client's retries.

Spark's own `FetchFailed` API describes the normal recovery path: invalidate the missing map output and rerun the earlier stage that generated it. A single successful retry can therefore be ordinary fault recovery. Repeated failures for the same host, shuffle, or disk are an infrastructure signal. Repeated failures spread across healthy hosts are more likely to indicate network saturation, oversized fetch pressure, or a shuffle-service bottleneck.

## Reconstruct the Failure in Timeline Order

Start with the driver log, not the final exception alone. Record the shuffle ID, map ID, reduce ID, block-manager address, stage attempt, and timestamp from the first fetch failure. Then look slightly earlier for an executor-removal message and its reason.

The distinction matters:

- If the executor or entire host disappeared first, the missing block is a consequence. Investigate the executor exit, container or pod event, node health, and decommission path.
- If the executor remained registered, inspect its log and the shuffle-service log for connection resets, timeouts, file-not-found messages, and checksum diagnostics.
- If many reducers report the same producer address, suspect that producer host or its shuffle service.
- If one reducer reports many unrelated producers, inspect the reducer host, its network path, and its local resource pressure.

In the Spark UI, open the failed stage attempt and sort the task table by failure, shuffle read, fetch-wait time, and remote bytes read. The official Web UI reference defines **Shuffle Read Fetch Wait Time** as time blocked waiting for remote shuffle data. High fetch wait with little executor CPU time supports an I/O diagnosis; high GC time or peak execution memory points toward memory pressure instead. Cross-reference the stage with the Executors tab to see lost executors and per-executor shuffle totals.

For retained event logs, the History Server and REST API expose the same task metrics. Preserve the event log and the cluster-manager events before retrying repeatedly, because ephemeral executor logs may vanish with the container.

## Separate Four Failure Classes

### 1. The producer executor or host was lost

Shuffle map outputs normally live on local storage associated with the executor. When those outputs are no longer available, Spark reruns their map tasks. Determine *why* the executor left: an out-of-memory kill, node loss, preemption, disk eviction, deliberate dynamic allocation, or decommissioning require different fixes.

Do not call every executor loss a network problem. A container exit code, Kubernetes event, YARN diagnostic, or operating-system OOM message is stronger evidence than the later fetch exception. If executors are routinely removed while their shuffle data is still needed, verify that the application's dynamic-allocation preservation mechanism is actually configured: an external shuffle service, shuffle tracking, graceful shuffle-block decommissioning, or a reliable custom shuffle storage implementation.

### 2. The network failure was transient

Spark's Netty shuffle client can retry I/O-related fetch errors. `spark.shuffle.io.maxRetries` controls the retry count and `spark.shuffle.io.retryWait` the wait between retries. `spark.shuffle.io.connectionTimeout` defaults to the general network timeout when not set separately.

Retries are appropriate for brief connection loss or a long pause. They do not repair a deleted file, a dead node, or a consistently overloaded service. Compare the first error with network telemetry: packet loss, connection resets, retransmits, interface saturation, and concurrent connections. If failures stop after a retry and hosts remain healthy, a modest retry review may be justified. If every retry targets a missing block, increasing the wait only delays recomputation.

### 3. Local disk or shuffle data is bad

Inspect the producer host for full filesystems, I/O errors, unexpected cleanup, and unhealthy volumes. Spark can calculate shuffle checksums. With shuffle checksums enabled, Spark can use the checksum file when diagnosing detected corruption, including whether the problem is consistent with disk or network corruption.

Treat `No space left on device`, missing index/data files, checksum mismatch, and kernel storage errors as disk evidence. Check every path configured through `spark.local.dir`; the effective directory may also be overridden by the cluster manager. Adding executor heap does not create local-disk capacity.

### 4. The external shuffle service is unavailable or saturated

When enabled and correctly installed, the external shuffle service serves executor-written shuffle files independently of the executor process. Check that the service is running on every eligible worker, that its configured service name and port match the application, and that it can access the same local directories.

Service-side connection limits and backlogs can also reject load. Correlate service logs with the exact producer host and time. A setting such as `spark.shuffle.maxChunksBeingTransferred` intentionally closes new connections at its limit; clients then retry and eventually surface a fetch failure if retries are exhausted. Tune such limits only after observing service pressure and host capacity.

## Use a Controlled Diagnostic Configuration

Capture the current values before changing anything:

```bash
spark-submit \
  --conf spark.eventLog.enabled=true \
  --conf spark.shuffle.checksum.enabled=true \
  --conf spark.shuffle.io.maxRetries=3 \
  --conf spark.shuffle.io.retryWait=5s \
  app.py
```

These example values are not a universal prescription. Configuration defaults and supported options vary by Spark release and deployment. The important experiment is to change one failure-handling dimension only after identifying whether the blocks still exist.

Also reduce the amount of evidence destroyed by a retry. Run a representative partition or time window, retain the event log, and label driver, executor, and node logs with synchronized timestamps. If a smaller shuffle succeeds while the full workload saturates a service or disk, the capacity relationship is useful; it still does not prove that larger timeouts are the solution.

## Fix the Cause, Then Prove Recovery

After correcting the suspected layer, rerun the same input and compare:

1. stage-attempt count and repeated map-stage recomputation;
2. lost executors and their removal reasons;
3. fetch-wait time and remote shuffle bytes by task;
4. shuffle-service errors and host network saturation;
5. local disk capacity, latency, and checksum errors.

A healthy run may still retry an isolated fetch. The success criterion is that failures no longer cluster around the same host or resource and that stage recomputation is bounded. Avoid masking a deterministic bad disk with more stage attempts: it raises runtime and load while leaving the fault in service.

## Official Documentation

- [Spark `FetchFailed` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/FetchFailed.html)
- [Spark Configuration: Shuffle Behavior and Networking](https://spark.apache.org/docs/latest/configuration.html)
- [Spark Web UI: Stage and Task Metrics](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)
- [Spark RDD Programming Guide: Shuffle Operations](https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations)
- [Spark Job Scheduling: Dynamic Resource Allocation](https://spark.apache.org/docs/latest/job-scheduling.html#dynamic-resource-allocation)
- [Spark Standalone Mode: External Shuffle Service](https://spark.apache.org/docs/latest/spark-standalone.html)

## Conclusion

Diagnose a fetch failure from the producer backward. Establish whether the executor vanished, the block vanished, the bytes were corrupted, or a live service could not deliver them. Spark's retries and stage recomputation provide resilience, but they are not root-cause fixes. Align the driver timeline, task metrics, cluster-manager events, shuffle-service logs, and disk evidence; then change only the setting or component supported by that evidence.
