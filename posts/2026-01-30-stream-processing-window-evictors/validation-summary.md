# Validation Summary: How to Create Window Evictors

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Apache Flink (DataStream API, Windowing API)
- Java
- JUnit 5 (Jupiter) for testing examples

## Sources Consulted
- Apache Flink Windowing documentation: https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/dev/datastream/operators/windows/
- Apache Flink `Evictor` interface source: `org.apache.flink.streaming.api.windowing.evictors.Evictor`
- Apache Flink `CountEvictor` source: `org.apache.flink.streaming.api.windowing.evictors.CountEvictor`
- Apache Flink `TimeEvictor` source: `org.apache.flink.streaming.api.windowing.evictors.TimeEvictor`
- Apache Flink `DeltaEvictor` source: `org.apache.flink.streaming.api.windowing.evictors.DeltaEvictor`
- Apache Flink `TimestampedValue` source: `org.apache.flink.streaming.runtime.operators.windowing.TimestampedValue`
- Apache Flink `DeltaFunction` JavaDoc: `org.apache.flink.streaming.api.functions.windowing.delta.DeltaFunction`

## Issues Found
No technical issues found.

Verified key claims:
- The `Evictor<T, W extends Window>` interface with `evictBefore` and `evictAfter` methods has the correct signature: `Iterable<TimestampedValue<T>>, int size, W window, EvictorContext`.
- `CountEvictor.of(maxCount)` indeed evicts oldest elements first (default `doEvictAfter=false`, removes from beginning of iterable until count <= maxCount).
- `TimeEvictor.of(interval)` correctly uses the maximum timestamp in the window as the cutoff reference; elements with `timestamp < maxTimestamp - interval` are evicted.
- `DeltaEvictor.of(threshold, deltaFunction)` correctly compares each element against the last element in the window using the delta function, removing elements where delta >= threshold.
- `EvictorContext` interface has the three documented methods: `getCurrentProcessingTime()`, `getMetricGroup()`, `getCurrentWatermark()`.
- `TimestampedValue<T>` is in package `org.apache.flink.streaming.runtime.operators.windowing` and has a public `(T value, long timestamp)` constructor as used in the test examples.
- Mutating the elements `Iterable` via `iterator.remove()` is the correct pattern for eviction in Flink's `EvictingWindowOperator`.
- Only one evictor can be attached to a window; the composite/chaining pattern correctly wraps multiple evictors inside a single `.evictor(...)` call.

## Review Notes
- Deprecation note: The post uses `org.apache.flink.streaming.api.windowing.time.Time` (e.g. `Time.minutes(5)`, `Time.seconds(30)`). This class has been deprecated since Flink 1.15 in favor of `java.time.Duration` (e.g. `TumblingEventTimeWindows.of(Duration.ofMinutes(5))`). The deprecated API still compiles and runs on Flink 1.x, so the examples remain functional, but a future revision could update to `Duration` for forward compatibility with Flink 2.x.
- The `DeltaFunction` example uses parameter names `oldPrice` / `newPrice`. Note that Flink's `DeltaEvictor` invokes the function as `getDelta(lastElementInWindow, currentIteratingElement)`, so the first parameter is the most-recently-added element. The example's symmetric `Math.abs(...)` calculation makes this naming inconsequential to correctness, but readers implementing asymmetric delta functions should be aware of the actual call ordering.
- `TimestampedValue` is annotated `@Internal` in Flink. Using it in tests is common practice but technically not part of the public API contract.
- The custom `OutlierEvictor` uses population variance (divides by N) rather than sample variance (N-1). This is a defensible choice for streaming windows where you treat the window contents as the full population, but readers preferring sample statistics should adjust accordingly.
