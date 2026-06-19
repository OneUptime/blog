# Validation Summary: How to Fix 'Checkpoint' Failures in Spark Streaming

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Apache Spark
- Spark Streaming DStreams
- PySpark
- Scala Spark Streaming
- HDFS
- S3A / Hadoop-compatible object storage
- Hadoop FileSystem shell
- Spark Streaming listeners

## Sources Consulted
- Apache Spark Streaming Programming Guide: https://spark.apache.org/docs/latest/streaming-programming-guide.html
- Apache Spark Configuration: https://spark.apache.org/docs/latest/configuration.html
- PySpark `StreamingContext` API: https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.streaming.StreamingContext.html
- PySpark `DStream.checkpoint` API: https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.streaming.DStream.checkpoint.html
- Apache Spark `StateSpec` Java/Scala API: https://spark.apache.org/docs/latest/api/java/org/apache/spark/streaming/StateSpec.html
- Apache Spark `BatchInfo` Java API: https://spark.apache.org/docs/latest/api/java/org/apache/spark/streaming/scheduler/BatchInfo.html
- Apache Hadoop FileSystem shell documentation: https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-common/FileSystemShell.html

## Issues Found
- The introduction implied checkpointing itself maintains exactly-once processing guarantees. This was corrected to say checkpointing supports driver recovery and stateful lineage recovery, while duplicate writes or data loss depend on input and sink semantics.
- The memory optimization example used `StateSpec`, `mapWithState`, and `.timeout(minutes=30)` as PySpark DStream APIs. `StateSpec`/`mapWithState` are Scala/Java Spark Streaming APIs, and timeout expects a Spark `Duration`. The example was changed to Scala and now uses `StateSpec.function(...).timeout(Minutes(30))`.

## Review Notes
Spark Streaming DStreams are a legacy Spark streaming engine as of current Spark documentation. The post correctly recommends considering Structured Streaming, but future revisions could make that caveat more prominent if the article is intended for new projects rather than maintenance of existing DStream jobs.
