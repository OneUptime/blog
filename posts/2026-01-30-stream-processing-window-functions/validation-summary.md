# Validation Summary: How to Build Window Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Flink (DataStream API)
- Stream processing windowing concepts (Tumbling, Sliding, Session, Global windows)
- Flink ReduceFunction, AggregateFunction, ProcessWindowFunction
- Flink WatermarkStrategy and event-time processing
- Flink Triggers (custom and built-in)
- Flink state backends (EmbeddedRocksDBStateBackend)
- Flink Kafka connector (FlinkKafkaConsumer)
- Flink metrics (Counter, Histogram)

## Sources Consulted
- Apache Flink DataStream API docs — Windows: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/dev/datastream/operators/windows/
- Apache Flink — Event Time / Watermark Strategies: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/dev/datastream/event-time/generating_watermarks/
- Apache Flink — Side Outputs: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/dev/datastream/side_output/
- Apache Flink — State Backends: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/state/state_backends/
- Flink Javadoc for `SingleOutputStreamOperator`, `WindowedStream`, `AggregateFunction`, `Trigger`, `TriggerContext`, `TriggerResult`, `WatermarkStrategy`, `ReducingStateDescriptor`

## Issues Found
1. **`getSideOutput` called on a `DataStream`-typed variable (Allowed Lateness example)** — The blog declared `DataStream<WindowStats> withLateness = ...sideOutputLateData(lateDataTag).aggregate(new StatsAggregator());` and then called `withLateness.getSideOutput(lateDataTag)`. However, `getSideOutput` is defined on `SingleOutputStreamOperator`, not on the parent `DataStream`, so this would fail to compile. Additionally, the declared element type `WindowStats` did not match the actual output type of `StatsAggregator`, which is `PartialStats`. Fixed by changing the declaration to `SingleOutputStreamOperator<PartialStats> withLateness = ...` so both the side-output method call and the aggregator's declared output type are correct.

## Review Notes
- The post uses the older `org.apache.flink.streaming.api.windowing.time.Time` class (e.g., `Time.minutes(5)`), which is deprecated in Flink 1.15+ in favor of `java.time.Duration`. The code still compiles and runs, so this is a deprecation note rather than an error. A future update could migrate to the `Duration`-based overloads of `TumblingEventTimeWindows.of`, `SlidingEventTimeWindows.of`, `EventTimeSessionWindows.withGap`, and `allowedLateness`.
- `FlinkKafkaConsumer` is deprecated and was removed in Flink 1.17 in favor of the unified `KafkaSource` (with `KafkaSource.<Metric>builder()...build()` and `env.fromSource(...)`). A future update could migrate this example.
- In the final example, `DashboardEnricher` computes `s.sum / s.count` style average only as part of building `DashboardMetric`; `DashboardStats` already exposes `avg` and `stddev`, and these are what's emitted, so no math issue.
- In the watermark generator, `maxTimestamp - maxOutOfOrderness.toMillis()` is correct, matching Flink's built-in `BoundedOutOfOrdernessWatermarks`.
- The percentile computation in `WindowStatsProcessor` is the standard nearest-rank method; not strictly the same as Flink's percentile metric implementations, but it is a valid approach for the purposes of an illustrative example.
- All window-assigner factory signatures, `TriggerResult` enum values, `Trigger` timer methods, `EmbeddedRocksDBStateBackend` usage, and the `WatermarkStrategy` interface implementation pattern were verified as correct.
