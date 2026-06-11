# Validation Summary: How to Implement Event Time Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Flink DataStream API
- Flink event time, watermarks, timestamp assigners, allowed lateness, and side outputs
- Apache Kafka Streams
- Kafka Streams timestamp extractors, stream time, grace periods, windowed aggregations, suppression, and Processor API
- Java

## Sources Consulted
- Apache Flink documentation: Timely Stream Processing: https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/
- Apache Flink documentation: Generating Watermarks: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/event-time/generating_watermarks/
- Apache Flink documentation: Windows: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Flink Javadocs: WatermarkStrategy: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/common/eventtime/WatermarkStrategy.html
- Apache Flink Javadocs: TumblingEventTimeWindows: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/windowing/assigners/TumblingEventTimeWindows.html
- Apache Kafka Streams Javadocs: TimeWindows: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Apache Kafka Streams Javadocs: ProcessorContext: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/processor/api/ProcessorContext.html
- Apache Kafka deprecated API list: https://kafka.apache.org/34/javadoc/deprecated-list.html
- Confluent Kafka Streams Javadocs: TimestampExtractor: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/processor/TimestampExtractor.html

## Issues Found
- Kafka Streams examples used `TimeWindows.ofSizeWithNoGrace(...).grace(...)`. `TimeWindows.grace(Duration)` is deprecated, and current Kafka Streams exposes `TimeWindows.ofSizeAndGrace(size, afterWindowEnd)` for this use case. Updated both Kafka Streams window examples.
- Flink examples used the older `Time.minutes(...)` helper for window sizes and allowed lateness. Current Flink documentation and Javadocs use `java.time.Duration` for `TumblingEventTimeWindows.of(...)` and `allowedLateness(...)`. Updated those snippets and removed the old `Time` imports.
- The custom Flink watermark generators emitted `currentMaxTimestamp - maxOutOfOrderness`. Because a `Watermark(t)` declares timestamps `<= t` complete, this can mark the boundary timestamp late. Updated the examples to subtract one millisecond, matching Flink's official bounded out-of-orderness generator pattern.
- The Kafka Streams complete example wrote a `KStream<Windowed<String>, ClickStats>` with an undefined `WindowedSerde`. Updated it to select the page ID as a regular string output key and use `Produced.with(Serdes.String(), new ClickStatsSerde())`.
- The Kafka Streams Processor API comment said `context.forward(..., "late-events-sink")` forwarded to a special topic. The API forwards to a named child processor. Updated the comment to describe a named downstream sink processor.
- The introduction implied processors reorder events based on timestamps. Event-time systems generally assign timestamps/windows and use watermarks rather than globally reordering events. Updated the diagram note.
- The timestamp section stated every event timestamp should be embedded in the payload. Kafka Streams can also use record metadata timestamps, so the wording was softened to say the timestamp must be available and is often embedded in the payload.
- Added missing imports for `java.util.Map` in the clock skew snippet and Flink event-time classes in the adaptive watermark snippet.

## Review Notes
The examples still use placeholder domain classes and sinks such as `MyEvent`, `ClickEvent`, `KafkaClickSource`, `DashboardSink`, and custom serdes, so they are illustrative rather than copy-paste complete. The Flink `addSource(...)` style remains valid in many deployments, but newer Flink applications should prefer the FLIP-27 `Source` API and connector-specific sources where available.
