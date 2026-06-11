# Validation Summary: How to Create Keyed State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Flink DataStream API
- Apache Flink keyed state
- ValueState, ListState, MapState, ReducingState, and AggregatingState
- Apache Flink State TTL
- Java

## Sources Consulted
- Apache Flink: Working with State: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/
- Apache Flink: DataStream API Overview: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/overview/
- Apache Flink: Process Function: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/process_function/
- Apache Flink Java API: StateTtlConfig.Builder: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/common/state/StateTtlConfig.Builder.html
- Apache Flink Java API: MapState: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/common/state/MapState.html
- Apache Flink Java API: TimerService: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/TimerService.html
- Apache Flink Java API: Time deprecation reference: https://nightlies.apache.org/flink/flink-docs-release-1.20/api/java/org/apache/flink/api/common/time/Time.html

## Issues Found
- The post described Flink as providing "four built-in types of keyed state." Official Flink documentation also lists AggregatingState as a keyed state type. Updated the wording, diagrams, best-practice note, and conclusion to include AggregatingState without restructuring the post.
- The TTL examples used `org.apache.flink.api.common.time.Time`, which is deprecated in favor of `java.time.Duration`. Updated TTL snippets to use `Duration.ofHours(24)` and `Duration.ofDays(90)`.
- The TTL example said `cleanupFullSnapshot()` cleans expired state during checkpoints. Official documentation describes this as cleanup in full snapshots and notes it is not applicable to incremental checkpointing in RocksDB. Updated the comment to say it excludes expired state from full snapshots.
- Several Java snippets referenced types without necessary imports, including `Configuration`, `Map.Entry`, `ReduceFunction`, `Types`, `ArrayList`, and `List`. Added the missing imports to the relevant examples so the snippets are technically complete.

## Review Notes
- The pipeline example uses `addSource` and `addSink`, which remain documented in the stable DataStream API, though newer connector examples often prefer `fromSource` and `sinkTo` where connector implementations support the newer interfaces.
- The fraud detection example uses processing-time timers while comparing transaction timestamps from the domain object. This is acceptable as a simplified example if those timestamps are processing-time-aligned, but production event-time fraud detection should use event-time timers, timestamps, and watermarks consistently.
