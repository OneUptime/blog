# Validation Summary: How to Fix 'State Store' Failures in Spark Streaming

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Apache Spark
- Spark Structured Streaming
- PySpark
- State Store
- RocksDB State Store Provider
- Checkpointing
- Kafka source
- HDFS-compatible storage

## Sources Consulted
- Apache Spark Structured Streaming Programming Guide: https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html
- Apache Spark State Data Source Integration Guide: https://spark.apache.org/docs/latest/streaming/structured-streaming-state-data-source.html
- PySpark StreamingQueryListener API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.StreamingQueryListener.html
- Apache Spark Configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- Apache Spark Spark Streaming Programming Guide, legacy note: https://spark.apache.org/docs/latest/streaming-programming-guide.html

## Issues Found
- The State Store data source example used an internal checkpoint subdirectory (`state/0/0`) as the `path`. Spark's State Data Source expects the root checkpoint location, so the example now uses `hdfs:///checkpoints/my-app`.
- The State Store data source section described the feature as recovery-oriented. Spark documents it as an experimental read/query feature for inspecting checkpoint state, so the heading and comment now say "inspect existing state" and note Spark 4.0+ experimental status.
- The memory overflow solution configured HDFS-backed state store snapshot/compression settings, which does not address large JVM-memory state. The example now switches to `RocksDBStateStoreProvider` and uses documented RocksDB bounded-memory settings.
- The watermark comment said all state older than one hour would be dropped. For windowed aggregations, state eviction depends on the watermark passing the window end time, so the comment now states that more precisely.
- The `StreamingQueryListener` example omitted `onQueryIdle`, which current PySpark exposes as part of the listener interface. Added a no-op `onQueryIdle` method.
- The final tuning snippet included older or undocumented state-store configuration keys. It now uses documented RocksDB tuning keys from Spark's current Structured Streaming guide.

## Review Notes
The post uses "Spark Streaming" in the title and prose, but the implementation details are for Structured Streaming. Spark's docs describe DStreams-based Spark Streaming as legacy and recommend Structured Streaming for new applications. The post tags and description already clarify Structured Streaming, so no title change was made.
