# Validation Summary: How to Create Late Data Handling

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Flink DataStream API
- Apache Flink Table API / SQL changelog streams
- Apache Flink Kafka connector
- Kafka Streams
- Event-time processing, watermarks, windowing, allowed lateness, side outputs, and retractions

## Sources Consulted
- Apache Flink windowing and allowed lateness documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Flink late events and side outputs documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/streaming_analytics/#late-events
- Apache Flink WindowedStream Java API documentation: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/datastream/WindowedStream.html
- Apache Flink TumblingEventTimeWindows Java API documentation: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/windowing/assigners/TumblingEventTimeWindows.html
- Apache Flink DataStream and Table API integration documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/data_stream_api/
- Apache Flink Kafka connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/kafka/
- Kafka Streams TimeWindows Java API documentation: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Google Dataflow Model paper: https://research.google/pubs/pub43864/

## Issues Found
- The Kafka Streams grace-period example used `TimeWindows.ofSizeWithNoGrace(...).grace(...)`, but current Kafka Streams APIs use `TimeWindows.ofSizeAndGrace(size, afterWindowEnd)` for tumbling windows with a grace period. Updated the snippet accordingly.
- Several Flink DataStream window examples used older `Time.hours(...)` and `Time.minutes(...)` style calls. Current Flink APIs document `Duration` overloads for `TumblingEventTimeWindows.of(...)` and `allowedLateness(...)`. Updated those examples to use `Duration`.
- The first Flink example used `env.addSource(...)`, which is the legacy source API. Updated it to use `env.fromSource(...)` with the watermark strategy.
- The Table API retraction example used legacy `toRetractStream(...)` and described Boolean tuple retractions. Current Flink documentation recommends changelog streams with `RowKind`, so the example now uses `tableEnv.toChangelogStream(...)` and handles `INSERT`, `UPDATE_AFTER`, `UPDATE_BEFORE`, and `DELETE`.
- The Table API section said "retraction mode is enabled by default" and implied late data automatically causes retractions. Reworded this to describe Flink's changelog rows more accurately.
- The tiered lateness example did not mention that a window function only sees records that survive the configured allowed lateness. Added a short note that `allowedLateness` must cover the largest tier intended for that window function.
- The metrics function was typed as `ProcessFunction<Event, Event>` but was later applied to a `DataStream<ClickEvent>`. Updated the function type to `ProcessFunction<ClickEvent, ClickEvent>`.
- The complete pipeline labeled the Kafka source itself as "exactly-once semantics." Reworded the comment to "Source: Kafka" because end-to-end exactly-once behavior depends on checkpointing and compatible sinks, not the source declaration alone.

## Review Notes
The examples remain illustrative and assume application-specific classes such as `ClickEvent`, `ClickCounter`, serializers, and sinks exist. Some snippets still use simplified sink placeholders for readability; production Flink 2.x applications should prefer the current Sink API where possible.
