# Validation Summary: Can a Spark Structured Streaming Checkpoint Survive a Query Change?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Spark 4.x
- Spark Structured Streaming
- Structured Streaming checkpoints and recovery semantics
- Spark state stores and state-schema evolution
- `transformWithState`, `mapGroupsWithState`, and `flatMapGroupsWithState`
- Apache Kafka streaming source options
- PySpark `DataStreamReader` and `DataStreamWriter`
- HDFS-compatible checkpoint and output storage

## Sources Consulted
- Apache Spark Structured Streaming recovery semantics after query changes - https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovery-semantics-after-changes-in-a-streaming-query
- Apache Spark Structured Streaming checkpoint recovery - https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovering-from-failures-with-checkpointing
- Apache Spark 4.2.0 release notes, streaming source and sink naming - https://spark.apache.org/releases/spark-release-4-2-0.html#streaming-source-and-sink-naming
- PySpark `DataStreamReader.name()` API - https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamReader.name.html
- Apache Spark `transformWithState` state-schema evolution guide - https://spark.apache.org/docs/latest/streaming/structured-streaming-transform-with-state.html#state-schema-evolution
- Apache Spark configuration reference for `spark.sql.streaming.stateStore.encodingFormat` - https://spark.apache.org/docs/latest/configuration.html
- Apache Spark 4.2.0 checkpoint metadata source for checkpoint-persisted SQL settings - https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/streaming/checkpointing/OffsetSeq.scala
- Apache Spark checkpoint-bound SQL configuration notes - https://spark.apache.org/docs/latest/streaming/additional-information.html#miscellaneous-notes
- Apache Spark Structured Streaming Kafka integration guide - https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html
- PySpark `DataStreamWriter.start()` API - https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.start.html
- Apache Spark Structured Streaming output-sink documentation - https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#output-sinks
- Apache Spark `StreamingQueryProgress` API - https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/StreamingQueryProgress.html
- Apache Spark asynchronous progress-tracking documentation - https://spark.apache.org/docs/latest/streaming/performance-tips.html#asynchronous-progress-tracking
- Apache Spark SQL error conditions for checkpoint, state-store, and query-evolution failures - https://spark.apache.org/docs/latest/sql-error-conditions.html

## Issues Found
- The input-source section presented the general prohibition on changing source count or type without Spark 4.2's experimental source-evolution exception. Qualified the default rule and documented the opt-in, stable-name requirements for adding, removing, or reordering sources while retaining a checkpoint.
- The stream-stream join compatibility bullet referred only to join-key schema and join type. Updated it to cover changes to either input schema, equi-join columns, and join type, and noted that other join-condition changes are ill-defined under Spark's recovery guide.
- The `transformWithState` paragraph did not explain that removing a state variable requires `deleteIfExists` in `StatefulProcessor.init`, or that enabling Avro only during restart cannot convert a checkpoint created with UnsafeRow encoding. Added both constraints and distinguished whole-variable evolution from value-schema evolution within a variable.
- The PySpark example referenced an undefined `transformed` DataFrame and started a writer without an explicit sink format or output path. Changed it to write the defined `source` DataFrame to an explicit Parquet output path while retaining the deliberately new checkpoint path.
- The checkpoint-reuse guidance said to back up checkpoint metadata, which could imply that state and log data may be omitted. Changed it to require a storage-consistent backup of the complete checkpoint.
- The checkpoint-copy section said that checkpoint file versions correspond to completed micro-batches. That was too absolute because offset and commit logs do not have to advance in lockstep, especially with asynchronous progress tracking. Reworded it to describe the files collectively as a recoverable processing history.

## Review Notes
The `latest` Apache Spark documentation resolved to Spark 4.2.0 on the validation date. The Kafka `startingOffsets` behavior, sink-change examples, stateless and stateful compatibility rules, checkpoint-bound SQL settings, checkpoint ownership guidance, progress metrics, replay warnings, and remaining code/API usage matched the current official documentation. The code fragment assumes that `spark` and `brokers` are defined, the Spark Kafka connector is available, and the HDFS paths are writable. All documentation links in the post resolved to their intended pages; no deprecated API usage was introduced.
