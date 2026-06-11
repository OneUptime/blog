# Validation Summary: How to Build Streaming Loading

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka
- Apache Flink DataStream API
- Apache Flink SQL
- Flink JDBC connector
- Flink Elasticsearch connector
- Flink FileSink / object storage sink
- PostgreSQL
- Elasticsearch
- S3-compatible object storage
- Python kafka-python client
- Prometheus alerting rules
- Flask health checks

## Sources Consulted
- Apache Flink JDBC DataStream connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/jdbc/
- Apache Flink JDBC SQL connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/table/jdbc/
- Apache Flink Kafka DataStream connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/kafka/
- Apache Flink Elasticsearch connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/elasticsearch/
- Apache Flink FileSystem connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/filesystem/
- Apache Flink Async I/O documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/asyncio/
- Apache Flink metrics documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/metrics/
- Apache Flink checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/checkpointing/
- Apache Kafka producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- kafka-python KafkaAdminClient documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaAdminClient.html
- Apache Spark Structured Streaming performance documentation: https://spark.apache.org/docs/latest/streaming/performance-tips.html

## Issues Found
- The post claimed the regular Flink `JdbcSink.sink` example wrote to PostgreSQL with exactly-once guarantees. Official Flink documentation states that `JdbcSink.sink` provides at-least-once delivery, while effectively exactly-once results require idempotent SQL or `JdbcSink.exactlyOnceSink` with XA support. Updated the wording to describe at-least-once delivery plus idempotent upserts.
- The Mermaid flowchart for idempotent writes used invalid `Note:` syntax in a flowchart. Replaced it with a normal node so the diagram can render.
- The Java Flink source used `WatermarkStrategy.forMonotonousTimestamps()` on raw JSON strings without assigning event timestamps. Changed the source to `WatermarkStrategy.noWatermarks()` and adjusted the comment.
- The sample Java file declared both `StreamingLoadingJob` and `Event` as public top-level classes in one file. Changed `Event` to package-private and added the missing `Timestamp` import.
- The Kafka producer emitted `payload` as a nested object, while the Java and Flink SQL examples expected a string payload. Changed the producer to serialize the details dictionary with `json.dumps(details)`.
- The Flink SQL JDBC sink comment overstated exactly-once semantics. Updated it to describe idempotent writes.
- The Elasticsearch example included an `indexed_at` value generated at write time, making retry replacement non-idempotent. Removed that field and clarified that retries replace the same document ID.
- The Elasticsearch and S3 examples omitted imports required by the shown snippets. Added imports for `ElasticsearchSink`, `Map`, `HashMap`, and `OutputFileConfig`.
- The S3 checkpoint comment implied each checkpoint simply creates a new file. Adjusted it to match Flink's documented behavior that bulk formats roll part files on checkpoints.
- The Flask health check imported unused or incorrect kafka-python symbols. Replaced them with `from kafka.admin import KafkaAdminClient` and made the consumer group check explicit.
- The Flink async retry example described retries but used `AsyncDataStream.unorderedWait`, which does not take a retry strategy. Updated it to use `unorderedWaitWithRetry` with an `AsyncRetryStrategy`.

## Review Notes
- The post is technically relevant and contains multiple implementation examples, so it was reviewed as a code-heavy technical guide.
- The remaining code examples are illustrative snippets and still omit surrounding build files, dependency declarations, database DDL, and some imports for brevity. A future improvement would be to pin a Flink connector version and provide a runnable Maven project.
- Related-reading URLs were checked and returned HTTP 200 on 2026-06-11.
