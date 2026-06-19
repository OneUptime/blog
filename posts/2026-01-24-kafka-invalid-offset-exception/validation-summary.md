# Validation Summary: How to Fix 'InvalidOffsetException' in Kafka

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Apache Kafka consumers and consumer groups
- Kafka Java client
- Kafka command-line tools
- confluent-kafka Python client
- Kafka topic retention and offset management

## Sources Consulted
- Apache Kafka ConsumerConfig documentation: https://kafka.apache.org/43/generated/consumer_config.html
- Apache Kafka KafkaConsumer Javadocs: https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka OffsetOutOfRangeException Javadocs: https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/consumer/OffsetOutOfRangeException.html
- Apache Kafka basic operations documentation for consumer group offset resets: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Confluent confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka log compaction documentation: https://docs.confluent.io/kafka/design/log_compaction.html

## Issues Found
- The introduction described the exception as fetching an offset that "does not exist" in the log. Changed this to offsets outside the broker's available partition range, which matches Kafka's `OffsetOutOfRangeException` documentation and avoids implying that compacted offset gaps are invalid.
- The diagram and common-cause list said log compaction can cause `OffsetOutOfRangeException`. Corrected this to retention/truncation causes, because compacted records leave valid offset positions and reads continue from the next available offset.
- The invalid-offset diagnosis only mentioned committed offsets lower than the earliest offset. Added that offsets greater than the latest/end offset are invalid, while `committed == latest` is valid because committed offsets represent the next record to consume.
- The Java manual reset example imported `OffsetOutOfRangeException` from `org.apache.kafka.common.errors`, which is incorrect. Changed it to `org.apache.kafka.clients.consumer.OffsetOutOfRangeException`.
- The Python examples used `seek_to_beginning()` and `seek_to_end()`, which are not `confluent-kafka` Consumer APIs. Replaced them with `get_watermark_offsets()` plus `seek()`, and committed explicit `TopicPartition` offsets when resetting a group.
- The Python error handling used numeric error codes. Replaced those with `KafkaError.OFFSET_OUT_OF_RANGE` and `KafkaError._AUTO_OFFSET_RESET` constants from the official API.
- The Python validation flow treated uncommitted `OFFSET_INVALID` values as too old. Updated it to skip partitions with no committed offset.
- The command-line reset examples omitted Kafka's requirement that the group be inactive before resetting offsets. Added a comment to that command block.
- The offset monitoring Java snippet could divide by zero when a partition had no retained offset span. Added a guard before calculating the percentage.

## Review Notes
- Python code blocks were syntax-checked locally. Kafka client libraries were not installed in the local environment, so runtime execution against a Kafka cluster was not performed.
- The Kafka CLI syntax and reset scenarios were checked against Apache Kafka operations documentation. The `kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list` examples are still plausible, though newer operational examples often prefer tooling that uses `--bootstrap-server` directly where available.
