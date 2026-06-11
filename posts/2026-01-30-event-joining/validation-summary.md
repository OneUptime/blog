# Validation Summary: How to Implement Event Joining

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Event-driven architecture
- Stream processing
- Windowed joins
- Event time and watermarks
- TypeScript
- Redis
- RocksDB
- Kafka state stores
- OpenTelemetry trace context

## Sources Consulted
- TypeScript Handbook: Classes - https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript Handbook: Interfaces - https://www.typescriptlang.org/docs/handbook/interfaces.html
- Apache Flink documentation: Timely Stream Processing - https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/
- Apache Flink documentation: Windows and Allowed Lateness - https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Kafka Streams documentation: Streams DSL stateful transformations and joins - https://kafka.apache.org/40/streams/developer-guide/dsl-api/
- Confluent Kafka Streams SlidingWindows Javadoc - https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/kstream/SlidingWindows.html
- OneUptime and related links referenced in the post were checked with HTTP status verification.

## Issues Found
- The `WindowedJoin.findMatches` helper always emitted the buffered event as `leftEvent` and the arriving event as `rightEvent`. This reversed the fields when processing a left-stream event against buffered right-stream events. I added an `eventSide` argument so emitted `JoinedEvent` objects preserve left/right stream identity.
- The window eviction example mixed event-time timestamps with processing-time `Date.now()`. This could evict historical or replayed events immediately even when they were still valid in event time. I changed the example to track the maximum observed event timestamp and evict against event time, while retaining events through `allowedLatenessMs`.

## Review Notes
- The TypeScript snippets compile successfully with `tsc --noEmit --target ES2020 --lib ES2020,DOM --skipLibCheck` after extraction from the Markdown.
- The examples are educational and intentionally simplified. A production stream processor would normally use partitioned state, checkpoints, framework-provided watermarks, and deterministic state-store cleanup rather than in-process maps alone.
