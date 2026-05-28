# Validation Summary: How to Implement Windowing Strategies in Dataflow Streaming Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam
- Apache Beam Java SDK
- Pub/Sub
- Streaming windowing

## Sources Consulted
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam Window JavaDoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/windowing/Window.html
- Apache Beam PubsubIO JavaDoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/pubsub/PubsubIO.html
- Apache Beam WithTimestamps JavaDoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/WithTimestamps.html
- Apache Beam GlobalWindows JavaDoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/windowing/GlobalWindows.html
- Apache Beam SlidingWindows JavaDoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/windowing/SlidingWindows.html
- Apache Beam Sessions JavaDoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/windowing/Sessions.html

## Issues Found
- The sliding-window example applied `Mean.perKey()` to a `PCollection<Double>`, which would not compile because `Mean.perKey()` expects keyed input. Changed the example to use `PCollection<KV<String, Double>>` for keyed sensor readings.
- The session-window explanation described closure in terms of new data arrival, which can be confused with processing time. Updated it to describe event-time activity gaps.
- The timestamp-assignment section recommended `WithTimestamps.withAllowedTimestampSkew`, which is deprecated in current Apache Beam JavaDoc and was described as comparing timestamps to the current watermark. Replaced the Pub/Sub example with `PubsubIO.Read.withTimestampAttribute`, which is the documented way to use a Pub/Sub message attribute as the logical event timestamp, and moved lateness guidance to window allowed lateness.

## Review Notes
The remaining examples are illustrative snippets and assume surrounding imports, pipeline setup, and helper functions such as `parseEventType`. The post does not pin an Apache Beam version; the review used current Apache Beam documentation available on 2026-05-28.
