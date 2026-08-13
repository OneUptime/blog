# Validation Summary: Will Spark Dynamic Allocation Lose Shuffle Files When It Removes an Executor?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Spark 4.2.0
- Spark dynamic resource allocation
- Spark external shuffle service
- Spark shuffle tracking
- Spark graceful executor decommissioning and block migration
- Spark `ShuffleDataIO` plugins and reliable shuffle storage
- Spark Web UI, History Server, event logs, REST API, and metrics
- Spark on Kubernetes and YARN

## Sources Consulted

- [Spark 4.2.0 Job Scheduling: Dynamic Resource Allocation](https://spark.apache.org/docs/4.2.0/job-scheduling.html#dynamic-resource-allocation)
- [Spark 4.2.0 Job Scheduling: Graceful Decommission of Executors](https://spark.apache.org/docs/4.2.0/job-scheduling.html#graceful-decommission-of-executors)
- [Spark 4.2.0 Configuration: Dynamic Allocation](https://spark.apache.org/docs/4.2.0/configuration.html#dynamic-allocation)
- [Spark 4.2.0 Configuration](https://spark.apache.org/docs/4.2.0/configuration.html)
- [Spark 4.2.0 on Kubernetes](https://spark.apache.org/docs/4.2.0/running-on-kubernetes.html)
- [Spark 4.2.0 on YARN: Configuring the External Shuffle Service](https://spark.apache.org/docs/4.2.0/running-on-yarn.html#configuring-the-external-shuffle-service)
- [Spark 4.2.0 RDD Programming Guide: Shuffle Operations](https://spark.apache.org/docs/4.2.0/rdd-programming-guide.html#shuffle-operations)
- [Spark 4.2.0 `FetchFailed` API](https://spark.apache.org/docs/4.2.0/api/scala/org/apache/spark/FetchFailed.html)
- [Spark 4.2.0 Web UI](https://spark.apache.org/docs/4.2.0/web-ui.html)
- [Spark 4.2.0 Monitoring and Instrumentation](https://spark.apache.org/docs/4.2.0/monitoring.html)
- [Spark 4.2.0 `ShuffleDriverComponents` API](https://spark.apache.org/docs/4.2.0/api/java/org/apache/spark/shuffle/api/ShuffleDriverComponents.html)
- [Spark 4.2.0 `ExecutorAllocationManager` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/ExecutorAllocationManager.scala)
- [Spark 4.2.0 `ExecutorMonitor` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/scheduler/dynalloc/ExecutorMonitor.scala)
- [Spark 4.2.0 `MigratableResolver` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/shuffle/MigratableResolver.scala)

## Issues Found

- The decommissioning example left shuffle tracking at its current default of `true`. Spark warns that combining tracking with shuffle decommissioning can prevent timely executor release. Added `spark.dynamicAllocation.shuffleTracking.enabled=false` and explained why it is needed when decommissioning is the selected preservation mechanism.
- The reliable-storage option had the same default interaction. Added the requirement to disable shuffle tracking when reliable storage is intended to permit timely removal of shuffle-bearing executors.
- The custom-migration requirement was imprecise. Replaced the generic reference to a custom shuffle implementation with Spark's experimental `MigratableResolver` contract for a custom `ShuffleManager`/resolver.
- The diagnostic checklist located shuffle-tracking evidence on the executor host, but Spark implements tracking in the driver-side executor-allocation components. Corrected it to use driver-side tracking logs and allocation metrics.
- The event-log advice did not mention that event logging is disabled by default. Changed it to advise enabling and preserving event logs.
- The cleanup guidance assumed all preserved data consumes worker-local disks and prohibited age-based cleanup categorically. Updated it to include a reliable plugin's backing store and Spark's documented TTL-managed decommission fallback storage.
- The original failure drill removed an executor for every mechanism, which is not the expected behavior of shuffle tracking. Replaced it with a mechanism-specific drill: removal for external service, decommissioning, or reliable storage, and executor retention for shuffle tracking.

## Review Notes

- All configuration property names and Boolean values in the corrected snippets are valid in Spark 4.2.0. `spark.storage.decommission.enabled=true` is necessary for block-manager migration even though the dynamic-allocation prerequisite list highlights only decommissioning and shuffle-block migration flags.
- `spark.dynamicAllocation.shuffleTracking.enabled` defaults to `true`, and `spark.dynamicAllocation.shuffleTracking.timeout` defaults to `infinity` in Spark 4.2.0.
- Spark's external shuffle service remains unsupported on Kubernetes. The post correctly directs Kubernetes users to other preservation mechanisms.
- Reliable custom `ShuffleDataIO` support is documented as experimental, and the relevant shuffle component interfaces are private or experimental APIs, so compatibility must be checked for each Spark release.
- A `FetchFailed` normally causes Spark to return to the producing shuffle-map stage and rerun the missing map output. The corrected post does not claim that every map task must always rerun.
- The Web UI, REST API, event log, and metrics claims were verified. History Server compaction of rolling event logs is lossy and can discard completed-stage or terminated-executor events, so diagnostic retention settings should be chosen carefully.
- All links in the post's Official Documentation section resolved to the intended current Spark documentation during validation; `/docs/latest/` resolved to Spark 4.2.0 on 2026-08-13.
