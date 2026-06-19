# Validation Summary: How to Fix 'Late Data' Handling in Streaming

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Spark Structured Streaming
- PySpark
- Kafka source integration
- Delta Lake streaming sink
- Event-time watermarks and window aggregations
- Structured Streaming state store and RocksDB

## Sources Consulted
- Apache Spark Structured Streaming Programming Guide: https://spark.apache.org/docs/3.5.6/structured-streaming-programming-guide.html
- Apache Spark Kafka Integration Guide: https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html
- PySpark DataFrame.agg API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.agg.html
- PySpark percentile_approx API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.percentile_approx.html
- Apache Spark Configuration Reference: https://spark.apache.org/docs/latest/configuration.html
- Delta Lake streaming reads and writes documentation: https://docs.delta.io/delta-streaming/

## Issues Found
- Fixed a Python syntax error in the Delta write example where a line-continuation backslash was placed inside an inline comment after `outputMode("append")`.
- Replaced the latency `agg` dictionary with explicit aggregate expressions. The original dictionary used duplicate keys and attempted to pass `percentile_approx` as a dict value, so only one aggregation would survive and the percentile expression would not be valid in that form.
- Fixed the late-data recovery example to import `expr`, preserve Kafka's documented `timestamp` column as `kafka_timestamp`, use the `lookback_hours` argument through Kafka's `startingTimestamp` option, and read Delta with `spark.read.format("delta").load(...)`.
- Fixed the outer-join merge expression in the late recovery example to use the joined `window` and `event_type` columns and `coalesce` null values before adding counts and amounts.
- Updated state monitoring metric names to use `numRowsDroppedByWatermark` and `durationMs.triggerExecution`, which match Structured Streaming progress JSON fields more closely than the original `numLateInputRows` and nested `triggerExecution.latency` access.
- Changed the memory-sink dashboard example from `update` mode to `complete` mode because Spark's documented memory sink is a debugging sink that supports append and complete modes.

## Review Notes
- The examples are valid as tutorial snippets, but production deployments should choose sink/output-mode combinations based on their Spark and Delta versions and should test checkpoint compatibility before changing stateful query schemas.
- The memory sink remains suitable only for local debugging or lightweight dashboard examples; a production dashboard should write to a durable sink.
