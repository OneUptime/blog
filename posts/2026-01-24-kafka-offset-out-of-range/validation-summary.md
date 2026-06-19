# Validation Summary: How to Fix 'Offset Out of Range' Errors in Kafka

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka consumer groups and offsets
- Kafka command-line tools
- kafka-python
- Java KafkaConsumer API
- Prometheus alerting rules
- Redis-backed offset checkpointing and deduplication

## Sources Consulted
- Apache Kafka consumer configuration documentation: https://kafka.apache.org/41/configuration/consumer-configs/
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- kafka-python KafkaConsumer API documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html
- Apache Kafka Java Consumer API/Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/Consumer.html
- Apache Kafka OffsetOutOfRangeException Javadocs: https://kafka.apache.org/34/javadoc/org/apache/kafka/clients/consumer/OffsetOutOfRangeException.html
- Confluent Kafka log compaction documentation: https://docs.confluent.io/kafka/design/log_compaction.html

## Issues Found
- The post used `LSO` to mean log start offset. This is ambiguous because Kafka commonly uses LSO for last stable offset. Replaced the abbreviation with "log start offset" or neutral diagram node names.
- The log compaction section incorrectly implied compacted-away records make their offsets out of range. Updated it to describe truncation/manual deletion as an out-of-range cause and clarified that compacted offsets remain valid log positions.
- The `kafka-get-offsets.sh --time latest` example was commented out in a way that made the diagnostic step incomplete. Made both earliest and latest commands active examples.
- The `auto_offset_reset='earliest'` Python comment claimed `enable_auto_commit=True` was required to "actually reset." Corrected the comment because `auto.offset.reset` controls reset behavior and auto commit only commits offsets after consumption resumes.
- Several Python examples sought to a new position and then called `commit()` without explicitly committing the sought offsets. Updated them to commit `OffsetAndMetadata` for the target positions.
- The Python `OffsetOutOfRangeError` recovery sample extracted affected partitions incorrectly from exception arguments. Updated it to handle the kafka-python dictionary shape and fall back to the current assignment.
- The Java recovery sample called `commitSync()` after `seek`, which can commit last-polled positions rather than the recovered positions. Updated it to commit an explicit `Map<TopicPartition, OffsetAndMetadata>`.
- The specific-offset CLI example used an invalid `--topic orders:partition:offset` form. Updated it to use Kafka's `--topic topic:partition-list` scope plus `--to-offset`.
- The timestamp reset CLI comment incorrectly described the datetime argument as milliseconds since epoch. Updated the wording to match `--to-datetime`.
- The checkpointing and idempotent-processing Python snippets were missing imports required by the shown code. Added the missing `OffsetOutOfRangeError`, `OffsetAndMetadata`, and `json` imports.

## Review Notes
The Prometheus examples are illustrative and assume matching exporter metrics exist, especially `kafka_consumer_group_last_activity_timestamp`. Future improvements could note that this metric name is not emitted by Kafka itself and must come from the chosen exporter or custom instrumentation.
