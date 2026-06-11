# Validation Summary: How to Create Global Windows in Stream Processing

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Stream processing windowing concepts
- Apache Beam Python SDK
- Apache Flink DataStream API
- TypeScript
- Watermarks, triggers, and accumulation modes

## Sources Consulted
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam Python trigger API reference: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.trigger.html
- Apache Flink DataStream windows documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Flink Trigger Java API reference: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/windowing/triggers/Trigger.html
- Apache Flink CountTrigger Java API reference: https://nightlies.apache.org/flink/flink-docs-release-2.0-preview1/api/java/org/apache/flink/streaming/api/windowing/triggers/CountTrigger.html
- Apache Flink state TTL documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/

## Issues Found
- Beam Python examples used `AfterFirst`, which is not in the current Python trigger API. Changed those examples to `AfterAny`, the current Python OR-composite trigger.
- Beam processing-time examples used `duration=timedelta(...)`, but the current Python `AfterProcessingTime` constructor takes a delay in seconds. Updated examples to numeric second delays.
- The post implied `AfterWatermark()` is a practical standalone event-time trigger for unbounded global windows. Clarified that it waits for the end of the global window and that unbounded global-window use cases need early firings or custom event-time trigger/timer logic.
- The post presented retractions as a generally available accumulation mode. Added a caveat that Beam Python currently exposes only discarding and accumulating modes.
- The Pub/Sub Beam example attempted to sum raw Pub/Sub messages and write a scalar directly to BigQuery. Added a simple decode-to-integer step and mapped the result to a row object before `WriteToBigQuery`.
- The Flink TTL snippet used `Time.hours(24)`. Updated it to `Duration.ofHours(24)`, matching current Flink state TTL documentation.
- The post implied processing-time triggers emit snapshots on a fixed scheduler even without new data. Clarified that Beam processing-time triggers are pane-relative and depend on data continuing to arrive.

## Review Notes
The Flink examples remain illustrative and rely on placeholder application types such as `Event`, `kafkaSource`, `sink`, and `AggregationFunction`. That is acceptable for this post, but a future runnable sample should include imports and concrete event/window function classes.
