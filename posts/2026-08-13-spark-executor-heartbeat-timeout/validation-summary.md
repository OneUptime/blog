# Validation Summary: Diagnose a Spark Executor Heartbeat Timeout

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Apache Spark executors, drivers, heartbeats, and RPC networking
- Spark configuration and `spark-submit`
- Spark Web UI, History Server, event logs, and REST task metrics
- JVM garbage collection and Spark memory management
- YARN and Kubernetes executor-container memory sizing
- Spark SQL Adaptive Query Execution and skew handling

## Sources Consulted

- [Apache Spark 4.2.0 Configuration](https://spark.apache.org/docs/4.2.0/configuration.html)
- [Apache Spark 4.2.0: Submitting Applications](https://spark.apache.org/docs/4.2.0/submitting-applications.html)
- [Apache Spark 4.2.0 Monitoring and Instrumentation](https://spark.apache.org/docs/4.2.0/monitoring.html)
- [Apache Spark 4.2.0 Web UI](https://spark.apache.org/docs/4.2.0/web-ui.html)
- [Apache Spark 4.2.0 Tuning Guide: Garbage Collection](https://spark.apache.org/docs/4.2.0/tuning.html#garbage-collection-tuning)
- [Apache Spark 4.2.0 Tuning Guide: Memory Management](https://spark.apache.org/docs/4.2.0/tuning.html#memory-management-overview)
- [Apache Spark 4.2.0 SQL Performance Tuning: Optimizing Skew Join](https://spark.apache.org/docs/4.2.0/sql-performance-tuning.html#optimizing-skew-join)
- [Apache Spark 4.2.0 on Kubernetes](https://spark.apache.org/docs/4.2.0/running-on-kubernetes.html)
- [Apache Spark 4.2.0 `HeartbeatReceiver` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/HeartbeatReceiver.scala)
- [Apache Spark 4.2.0 `Executor` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/executor/Executor.scala)
- [Apache Spark 4.2.0 `LiveListenerBus` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/scheduler/LiveListenerBus.scala)
- [Apache Spark 4.2.0 `AsyncEventQueue` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/scheduler/AsyncEventQueue.scala)

## Issues Found

- The Environment-tab guidance implied that all effective values, including defaults, appear there. It now says that the tab shows explicitly set values and that documented defaults must be used for absent properties.
- The monitoring paragraph did not distinguish live heartbeat-driven updates from data retained in the event log. It now describes History Server reconstruction from logged events and notes that per-stage executor metric peaks require `spark.eventLog.logStageExecutorMetrics`.
- The custom-listener wording implied synchronous event dispatch. It now explains that Spark dispatches listener events asynchronously, while callbacks within a queue run serially and can backlog or overflow that queue.
- The post said increasing `spark.executor.memory` could leave the container limit unchanged. For Spark-managed YARN and Kubernetes executors, heap contributes to the container size and default memory overhead is derived from heap. The text now correctly states that increasing heap normally increases container size but does not directly solve non-heap pressure, especially when `spark.executor.memoryOverhead` is fixed explicitly.
- The post compared executor run time and executor CPU time without accounting for their different REST metric units. It now requires conversion between `executorRunTime` milliseconds and `executorCpuTime` nanoseconds before comparison.

## Review Notes

- The `spark-submit` example is valid: repeated `--conf key=value` arguments, `10s` and `120s` duration values, and a Python application file are supported.
- Spark 4.2.0 was the current documentation release at validation time. All eight links in the post's Official Documentation section resolved successfully, including both tuning-guide anchors.
- Executor expiry is checked periodically according to `spark.network.timeoutInterval`. An explicitly configured `spark.storage.blockManagerHeartbeatTimeoutMs` overrides `spark.network.timeout` as the executor heartbeat-expiry threshold.
- Task `jvmGCTime` is supporting evidence rather than proof that one task caused a pause; concurrent tasks can each include the same executor-wide GC interval.
