# Validation Summary: How to Create State Cleanup

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Apache Flink (KeyedProcessFunction, ValueState, MapState, ListState)
- Flink State TTL (StateTtlConfig API)
- Flink TimerService (processing time and event time timers)
- Flink Metrics (Counter, Gauge, MetricGroup)
- Prometheus metrics export
- RocksDB state backend (compaction filter cleanup)
- Mermaid diagrams
- SQL (TimescaleDB-style queries for Grafana)
- Java (text blocks)

## Sources Consulted
- Apache Flink documentation on State TTL: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/#state-time-to-live-ttl
- Apache Flink documentation on Process Functions and Timers: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/process_function/
- Apache Flink documentation on Working with State: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/
- Apache Flink Metrics documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/metrics/
- Apache Flink Prometheus reporter docs: https://nightlies.apache.org/flink/flink-docs-stable/docs/deployment/metric_reporters/#prometheus

## Issues Found
No technical issues found. All Flink APIs used in the code examples are valid:

- `KeyedProcessFunction<K, I, O>` generic signature and lifecycle methods (`open`, `processElement`, `onTimer`) are correct.
- State descriptor classes (`ValueStateDescriptor`, `MapStateDescriptor`, `ListStateDescriptor`) and access via `getRuntimeContext().getState()/getMapState()/getListState()` are correct.
- `TimerService` methods (`registerProcessingTimeTimer`, `deleteProcessingTimeTimer`, `registerEventTimeTimer`, `currentProcessingTime`) match the documented API.
- `StateTtlConfig` builder methods, including `setUpdateType`, `setStateVisibility`, `cleanupFullSnapshot`, `cleanupIncrementally(int, boolean)`, and `cleanupInRocksdbCompactFilter(long)` are valid.
- TTL enum values (`UpdateType.OnCreateAndWrite`, `UpdateType.OnReadAndWrite`, `StateVisibility.NeverReturnExpired`, `StateVisibility.ReturnExpiredIfNotCleanedUp`) are correct.
- `descriptor.enableTimeToLive(ttlConfig)` is the correct method to attach TTL to a state descriptor.
- The event-time window cleanup math (`windowStart = timestamp - ALLOWED_LATENESS - WINDOW_SIZE`) correctly inverts the registration formula (`cleanupTime = windowEnd + ALLOWED_LATENESS`).
- Metric registration via `getRuntimeContext().getMetricGroup().counter(name)` and `.gauge(name, gauge)` is correct, including the use of a lambda for the `Gauge<T>` functional interface.
- Both Prometheus reporter styles shown (legacy `class` property and newer `factory.class` property pointing to `PrometheusReporterFactory`) are valid Flink configuration options.

## Review Notes
- The post uses `org.apache.flink.api.common.time.Time` (with `Time.hours()`, `Time.minutes()`), which is deprecated in newer Flink releases in favor of `java.time.Duration`. The deprecated API still works in Flink 1.x and is widely used in tutorials, so this is not a technical error, but readers on Flink 2.x may prefer to use `Duration.ofHours(24)` etc.
- The `open(Configuration parameters)` lifecycle method is deprecated in favor of `open(OpenContext openContext)` in recent Flink releases, but the deprecated method still functions correctly.
- The `flink-conf.yaml` configuration file referenced in the metrics section was renamed to `config.yaml` in Flink 2.0; production deployments on Flink 2.x should use the new filename.
- The Grafana SQL examples use `time_bucket` and `interval` syntax that is TimescaleDB/PostgreSQL-specific. This is appropriate for setups that backstop Grafana with TimescaleDB, but readers using PromQL directly against Prometheus would write different queries.
- The text block in `MetricsConfiguration.PROMETHEUS_CONFIG` uses `\\` which renders as a literal backslash in the resulting YAML string. YAML does not natively use backslash line continuation, so the property name and class value would ideally appear on a single line in actual deployments. This is a cosmetic/illustrative artifact in a tutorial sample rather than a technical error.
- The advice in "Common Pitfalls" (timer explosion, incremental cleanup, monitoring) reflects established Flink best practices.
