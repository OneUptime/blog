# Validation Summary: Diagnose Rising Kafka Lag in Spark Structured Streaming

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Apache Spark 4.2.0
- Spark Structured Streaming and micro-batch triggers
- PySpark streaming query monitoring
- Spark checkpoint recovery and `AvailableNow`
- Spark state-operator, stage, task, and sink metrics
- Spark's Apache Kafka source connector
- Apache Kafka 4.3.x topics, partitions, offsets, consumer groups, transactions, and log compaction
- Kafka consumer lag, rate limiting, source parallelism, and backlog recovery

## Sources Consulted

- [Spark 4.2.0 Structured Streaming Kafka Integration](https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html)
- [Spark 4.2.0 Structured Streaming: Monitoring Streaming Queries](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#monitoring-streaming-queries)
- [Spark 4.2.0 Structured Streaming: Triggers](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#triggers)
- [Spark 4.2.0 Structured Streaming: Recovery Semantics after Query Changes](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovery-semantics-after-changes-in-a-streaming-query)
- [Spark 4.2.0 `StreamingQueryProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/StreamingQueryProgress.html)
- [Spark 4.2.0 `SourceProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/SourceProgress.html)
- [Spark 4.2.0 `SinkProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/SinkProgress.html)
- [Spark 4.2.0 `StateOperatorProgress` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/sql/streaming/StateOperatorProgress.html)
- [Spark 4.2.0 `Trigger` API](https://spark.apache.org/docs/latest/api/java/org/apache/spark/sql/streaming/Trigger.html)
- [PySpark 4.2.0 `StreamingQuery.lastProgress` API](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.StreamingQuery.lastProgress.html)
- [Spark 4.2.0 Web UI](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark 4.2.0 `ProgressReporter` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/streaming/runtime/ProgressReporter.scala#L314-L394)
- [Spark 4.2.0 `MicroBatchExecution` source](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/streaming/runtime/MicroBatchExecution.scala#L1232-L1260)
- [Apache Kafka 4.3: Basic Kafka Operations](https://kafka.apache.org/43/operations/basic-kafka-operations/)
- [Apache Kafka 4.3: Consumer Offset Tracking](https://kafka.apache.org/43/implementation/distribution/#consumer-offset-tracking)
- [Apache Kafka 4.3: Reading Transactional Messages](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html#reading-transactional-messages)
- [Apache Kafka 4.3: Log Compaction](https://kafka.apache.org/43/design/design/#log-compaction)

## Issues Found

- The metric-retention list incorrectly scoped trigger-, query-, and source-level metrics to every Kafka topic-partition and implied that standard sink progress universally exposes commit latency and failures. Separated trigger/source metrics from per-topic-partition offset JSON, limited sink data to connector-reported metrics, and directed failure collection to termination events or logs.
- The rate-comparison guidance did not explain that Spark's two reported row rates use different time denominators, or that `inputRowsPerSecond` reflects rows selected by Spark rather than uncapped Kafka producer ingress when a query is rate-limited or backlogged. Added a same-unit, same-wall-clock-window requirement and guidance to derive sustained arrival and completed progress from comparable offset or row deltas.
- The `durationMs.addBatch` guidance treated a long value as sink-specific. Corrected it to state that `addBatch` covers complete micro-batch execution, including operator execution and the sink, and that stage/task and sink-specific metrics are required to separate those costs.
- The trigger-interval guidance stated unconditionally that shorter intervals reduce batch size and longer intervals increase it. Qualified this behavior to queries that keep up and documented that, after a batch exceeds the requested processing-time interval, Spark starts the next batch immediately after completion.

## Review Notes

- Both PySpark snippets are syntactically valid and use current APIs and Kafka source option names.
- `maxOffsetsPerTrigger`, `minOffsetsPerTrigger`, `maxTriggerDelay`, and `minPartitions` are documented current options. `maxRecordsPerPartition` is documented in Spark 4.x but not Spark 3.5.x, so the post's version-qualified wording is appropriate.
- Spark explicitly permits adding, deleting, or modifying rate limits when restarting from the same checkpoint, while warning that the semantic effect of an allowed change still depends on the query and change.
- The Kafka source does not commit offsets to Kafka. Its generated group ID and forced `kafka.group.id` warnings, checkpoint-resume behavior, and `startingOffsets` behavior were verified.
- `AvailableNow` processes data available at execution in one or more micro-batches and then terminates; unsupported sources may fall back to a one-time micro-batch, so the post's support warning is appropriate.
- Kafka offset distance is not guaranteed to equal readable record count because of offset gaps, transactions, and compaction. For `read_committed` queries, external lag measurements should also use isolation-consistent last-stable-offset semantics rather than blindly comparing against a raw high watermark.
- All links in the post's Official Documentation section resolved to the intended Apache Spark or Apache Kafka documentation during validation. Spark `/docs/latest/` resolved to Spark 4.2.0 on 2026-08-13; Kafka `/43/` refers to the Kafka 4.3 documentation line.
