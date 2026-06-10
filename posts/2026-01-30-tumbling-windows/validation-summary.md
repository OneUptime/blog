# Validation Summary: How to Create Tumbling Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Stream processing concepts (tumbling, sliding, session, hopping windows)
- Kafka Streams (Java DSL: `TimeWindows`, `KStream`, `KTable`, `Suppressed`)
- Apache Flink DataStream API (`TumblingEventTimeWindows`, `WatermarkStrategy`, `AggregateFunction`, `ProcessWindowFunction`, side outputs, `EmbeddedRocksDBStateBackend`)
- Event-time vs processing-time semantics, watermarks, allowed lateness

## Sources Consulted
- Apache Flink master docs — Windows: https://nightlies.apache.org/flink/flink-docs-master/docs/dev/datastream/operators/windows/
- Apache Flink master docs — Built-in watermark generators: https://nightlies.apache.org/flink/flink-docs-master/docs/dev/datastream/event-time/built_in/
- Flink `WatermarkStrategy` Javadoc (2.1): https://nightlies.apache.org/flink/flink-docs-release-2.1/api/java/org/apache/flink/api/common/eventtime/WatermarkStrategy.html
- Flink `AggregateFunction` Javadoc: https://nightlies.apache.org/flink/flink-docs-master/api/java/org/apache/flink/api/common/functions/AggregateFunction.html
- FLIP-335 — Removing Flink's Time classes: https://cwiki.apache.org/confluence/display/FLINK/FLIP-335:+Removing+Flink's+Time+classes
- Kafka Streams `TimeWindows` Javadoc: https://kafka.apache.org/35/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- KIP-633 — Deprecate 24-hour default grace period: https://cwiki.apache.org/confluence/display/KAFKA/KIP-633:+Deprecate+24-hour+Default+Grace+Period+for+Windowed+Operations+in+Streams

## Issues Found

1. **Flink `Time` class used throughout — removed in Flink 2.0.** FLIP-335 deprecated `org.apache.flink.streaming.api.windowing.time.Time` (Flink 1.18/1.19) and removed it in Flink 2.0 (released 2025). Code using `Time.minutes(1)`, `Time.seconds(30)`, etc. will not compile against current Flink. Replaced all occurrences with `java.time.Duration`:
   - `TumblingEventTimeWindows.of(Time.minutes(1))` → `TumblingEventTimeWindows.of(Duration.ofMinutes(1))`
   - `.allowedLateness(Time.seconds(30))` → `.allowedLateness(Duration.ofSeconds(30))`
   - `Time.hours(1)`, `Time.minutes(30)` (offset) → `Duration.ofHours(1)`, `Duration.ofMinutes(30)`
   - Removed `import org.apache.flink.streaming.api.windowing.time.Time;` from both code blocks; added `import java.time.Duration;` where missing.

2. **`CountAggregator` stored the current key in an instance field.** Flink's `AggregateFunction` instance is shared across all keys on an operator subtask; only the accumulator is per-key/per-window. Storing `private String currentKey` and writing to it in `add(...)` is a real correctness bug — concurrent keys clobber each other and `getResult` may return the wrong key. Restructured to carry the key inside the accumulator using `Tuple2<String, Long>` (key, count). Updated `createAccumulator`, `add`, `getResult`, and `merge` accordingly. Type parameter changed from `AggregateFunction<PageViewEvent, Long, Tuple2<String, Long>>` to `AggregateFunction<PageViewEvent, Tuple2<String, Long>, Tuple2<String, Long>>`.

3. **`RocksDBStateBackend` is deprecated.** `org.apache.flink.contrib.streaming.state.RocksDBStateBackend` (which bundled state + checkpoint storage) was deprecated in favor of `EmbeddedRocksDBStateBackend`, with checkpoint storage now configured separately on `CheckpointConfig`. Replaced with:
   ```java
   env.setStateBackend(new EmbeddedRocksDBStateBackend(true));
   env.getCheckpointConfig().setCheckpointStorage("hdfs://namenode:9000/flink/checkpoints");
   ```
   The `true` argument enables incremental checkpoints, matching the comment in the original code.

4. **Pitfall 1 contained a misleading comment and a field-name mismatch.** The "Wrong" example used `WatermarkStrategy.forMonotonousTimestamps()` and the comment said "Using processing time when you need event time" — but `forMonotonousTimestamps()` is an event-time strategy that assumes monotonic timestamps; the actual problem in the snippet is that no `withTimestampAssigner(...)` is provided, so events have no event time extracted from their payload. Updated the comment to reflect the real issue. Also corrected `event.eventTime` → `event.timestamp` to match the `PageViewEvent` field defined earlier in the post.

## Review Notes

- Kafka Streams snippets (`TimeWindows.ofSizeWithNoGrace(Duration)`, `TimeWindows.ofSizeAndGrace(Duration, Duration)`, `Suppressed.untilWindowCloses(BufferConfig.unbounded())`) are correct against Kafka 3.0+ (KIP-633) and remain current.
- The conceptual content (definitions of tumbling/sliding/session/hopping windows, event-time vs processing-time discussion, late-data handling strategies, best practices around window sizing and grace periods, watermark idleness) is accurate.
- The `ProcessWindowFunction` example (`PageViewWindowFunction`) is technically correct, but be aware that for high-cardinality keys, holding all events in an `Iterable` is memory-intensive — pairing `aggregate(AggregateFunction, ProcessWindowFunction)` is generally preferred and would be worth mentioning as a follow-up. Not changed here per scope rules.
- The `TumblingProcessingTimeWindows` class is mentioned but not demonstrated; that's fine for the scope of the post.
- The Mermaid diagrams are illustrative and accurate.
