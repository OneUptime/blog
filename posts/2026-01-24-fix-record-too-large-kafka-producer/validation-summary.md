# Validation Summary: How to Fix 'Record Too Large' Errors in Kafka Producer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Apache Kafka producers, brokers, topics, consumers, and CLI tools
- Java Kafka client configuration
- Kafka message compression and chunking patterns
- Amazon S3 external payload storage
- AWS SDK for Java 2.x

## Sources Consulted
- Apache Kafka Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Confluent Kafka CLI Tools documentation for kafka-configs usage: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- AWS announcement: AWS SDK for Java 1.x end-of-support on December 31, 2025: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-java-v1-x-on-december-31-2025/
- AWS SDK for Java 2.x S3 examples: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/java_s3_code_examples.html
- AWS SDK for Java 2.x Developer Guide: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/home.html

## Issues Found
- The Kafka size-limit table described broker and topic defaults as exactly 1 MB and described broker/topic limits as message-size limits. Updated `message.max.bytes` and `max.message.bytes` to the documented 1,048,588-byte default and clarified that they apply to record batch size after compression.
- The consumer-side limits table omitted `max.partition.fetch.bytes` and treated `fetch.max.bytes` as an absolute maximum. Added `max.partition.fetch.bytes` and noted that Kafka may still return the first oversized batch so consumers can make progress.
- The initial Mermaid flow placed the topic-level size check after log write. Adjusted the diagram so the topic configuration check happens before storage.
- The `MessageSizeChecker` Java example used `Map` without importing it. Added the missing `java.util.Map` import.
- The chunking producer example used `Future<RecordMetadata>` without importing `Future`. Added the missing `java.util.concurrent.Future` import.
- The broker socket receive buffer comment implied that the socket receive buffer must accommodate the full message size. Revised the comment because Kafka's socket receive buffer is not the same as the maximum Kafka record batch size.
- The external-storage example used AWS SDK for Java 1.x APIs, which reached end-of-support on December 31, 2025. Updated the S3 producer and consumer snippets to AWS SDK for Java 2.x (`S3Client`, `PutObjectRequest`, `RequestBody`, `GetObjectRequest`, and `getObjectAsBytes`).
- The external-storage inline-message path encoded the payload but sent only a reference object, while the consumer decoded the whole JSON record value. Added an `inlineData` field to the reference object and changed the consumer to decode that field.
- The quick diagnostic command attempted to inspect producer client configuration with `kafka-configs.sh --entity-type clients`, which describes broker-side client entity configs such as quotas, not an application's local producer settings. Replaced it with a local properties-file `grep` example.

## Review Notes
- Kafka CLI tools were not installed in the local environment, so command syntax was verified against official documentation instead of local `--help` output.
- Java was not installed in the local environment, so Java snippets were reviewed statically against official APIs and documentation rather than compiled locally.
