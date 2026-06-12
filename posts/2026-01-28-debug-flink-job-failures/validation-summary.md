# Validation Summary: How to Debug Flink Job Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Apache Flink (DataStream API, state backends, checkpointing, savepoints)
- Flink Web UI and REST API
- Flink metrics (Prometheus-exposed)
- Apache Kafka (consumer lag debugging)
- RocksDB state backend (EmbeddedRocksDBStateBackend)
- log4j / log4j2 configuration
- Kubernetes (kubectl for log access)
- Mermaid diagrams (documentation)

## Sources Consulted
- Apache Flink 1.19 configuration reference: https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/deployment/config/
- Apache Flink metrics documentation: https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/ops/metrics/
- Apache Flink state backends documentation: https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/ops/state/state_backends/
- Apache Flink checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/dev/datastream/fault-tolerance/checkpointing/
- Apache Flink state TTL documentation: https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/dev/datastream/fault-tolerance/state/
- Apache Flink CLI / savepoint documentation: https://nightlies.apache.org/flink/flink-docs-release-1.19/docs/deployment/cli/

## Issues Found
1. **Invalid Flink memory configuration option** — The post referenced `taskmanager.memory.jvm-heap.size`, which is not a valid Flink configuration key. Flink does not expose a single "jvm-heap" size knob; the TaskManager heap is split between `taskmanager.memory.task.heap.size` (user code / task heap) and `taskmanager.memory.framework.heap.size` (framework heap). Fixed in two places: (a) the OOM debugging Mermaid diagram that mapped "Heap" to a config option, and (b) the `flink-conf.yaml` adjustment snippet under "Pattern 1: OutOfMemoryError". Both now use `taskmanager.memory.task.heap.size`, which is the option the surrounding comment ("Heap for Java objects in user code") describes.

## Review Notes
- All Prometheus-style metric names verified against the official Flink metrics docs are correct. Note that `flink_jobmanager_job_uptime` is marked deprecated in current Flink docs but still functional; left as-is since it remains widely emitted and useful for debugging.
- The `StateTtlConfig.newBuilder(Time.hours(24))` example uses `org.apache.flink.api.common.time.Time`, which is deprecated in Flink 1.17+ in favor of `java.time.Duration` (`Duration.ofHours(24)`). It still compiles and works in current Flink 1.x releases, so it was left in place; readers targeting Flink 2.0 should switch to `Duration`.
- Similarly, `TumblingEventTimeWindows.of(Time.minutes(1))` uses the deprecated `Time` class; same caveat as above.
- `registerKryoType` and `registerTypeWithKryoSerializer` on `ExecutionConfig` are valid in Flink 1.x but are deprecated/reworked in newer versions as the type system evolves. Acceptable for a debugging guide aimed at current production deployments.
- The simplified mapping in the OOM diagram (Direct/Native → managed memory) is a reasonable first-pass heuristic. Direct buffer OOMs can also stem from network buffers or task off-heap memory, but the post's pattern-based guidance is appropriate for a debugging-focused article.
- `flink cancel` is still valid but `flink stop` (which can produce a savepoint) is preferred for graceful shutdowns in newer versions; not changed since `cancel` is explicitly used in the post for the "if job is stuck" path, where forcing termination is the intent.
