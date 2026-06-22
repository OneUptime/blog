# Validation Summary: How to Manage Kafka Consumer Offsets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka consumer groups and offsets
- Kafka command-line tools
- Kafka Java AdminClient and Consumer APIs
- kafka-python KafkaAdminClient

## Sources Consulted
- Apache Kafka Basic Kafka Operations: https://kafka.apache.org/43/operations/basic-kafka-operations/
- Apache Kafka ConsumerGroupCommandOptions source: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/consumer/group/ConsumerGroupCommandOptions.java
- Apache Kafka GetOffsetShell source: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/GetOffsetShell.java
- Apache Kafka AdminClient Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/admin/AdminClient.html
- Apache Kafka OffsetSpec Javadocs: https://kafka.apache.org/36/javadoc/org/apache/kafka/clients/admin/OffsetSpec.html
- Apache Kafka ConsumerConfig Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerConfig.html
- kafka-python KafkaAdminClient documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaAdminClient.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html

## Issues Found
- The offset diagram treated the log-end offset as the last message offset. Kafka log-end/highwater offsets represent the next offset to be assigned, so I corrected the example to use a committed offset of 4, a log-end offset of 10, and lag of 6.
- The reset-offset examples did not mention that the consumer group must have no active members. I added a short note before the reset commands because Kafka's reset and admin offset-alter operations require an inactive/empty group.
- The Python `kafka-python` example used incorrect method names and offset value types for current `KafkaAdminClient` APIs. I updated it to use `list_group_offsets`, `reset_group_offsets`, `list_partition_offsets`, `OffsetSpec.EARLIEST`, `OffsetSpec.LATEST`, and `TopicPartition` from `kafka.structs`.

## Review Notes
- The Kafka CLI tools were not installed locally, so command validation was performed against Apache Kafka documentation and the official Apache Kafka tool source.
- The Java AdminClient examples use APIs that are present in current Kafka client Javadocs. They still require the target consumer group to be empty when altering committed offsets.
