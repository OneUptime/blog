# Validation Summary: How to Create Kafka Topics with Best Practices

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- Apache Kafka (CLI tools: kafka-topics.sh, kafka-configs.sh, kafka-run-class.sh / GetOffsetShell)
- Kafka AdminClient API (Java)
- confluent-kafka-python (Python AdminClient)
- Kafka Producer configuration (Java)
- Mongey/kafka Terraform provider
- Strimzi KafkaTopic Custom Resource (apiVersion: kafka.strimzi.io/v1beta2)
- Compression algorithms (lz4, snappy, gzip, zstd)
- Topic configuration semantics (retention.ms, retention.bytes, segment.bytes, segment.ms, cleanup.policy, min.insync.replicas, min.cleanable.dirty.ratio, delete.retention.ms)

## Sources Consulted
- Apache Kafka official documentation — https://kafka.apache.org/documentation/
- Kafka topic-level configurations — https://kafka.apache.org/documentation/#topicconfigs
- Kafka AdminClient Javadoc — https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/admin/AdminClient.html
- Kafka NewTopic Javadoc — https://kafka.apache.org/40/javadoc/org/apache/kafka/clients/admin/NewTopic.html
- Kafka TopicConfig constants — https://kafka.apache.org/40/javadoc/org/apache/kafka/common/config/TopicConfig.html
- Kafka producer configs — https://kafka.apache.org/documentation/#producerconfigs
- confluent-kafka-python admin API — https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html#admin-api
- Strimzi KafkaTopic CRD reference (v1beta2) — https://strimzi.io/docs/operators/latest/configuring.html
- Mongey/kafka Terraform provider — https://registry.terraform.io/providers/Mongey/kafka/latest/docs
- GetOffsetShell source / KIP-734 deprecation of --broker-list — https://issues.apache.org/jira/browse/KAFKA-13367

## Issues Found
1. **Deprecated `--broker-list` flag in `GetOffsetShell` example.** The "Checking Topic Status" section used `kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list localhost:9092 ...`. The `--broker-list` flag has been deprecated in favor of `--bootstrap-server` since Kafka 3.0 (and is the canonical flag across the rest of the post). Updated to `--bootstrap-server localhost:9092` for consistency and modern correctness.

## Review Notes
- All time/byte literal arithmetic was verified: 604800000 ms = 7 days, 2592000000 ms = 30 days, 86400000 ms = 1 day, 3600000 ms = 1 hour, 21600000 ms = 6 hours, 1073741824 B = 1 GiB, 53687091200 B = 50 GiB, 10485760 B = 10 MiB — all correct.
- Kafka topic name 249-character limit is accurate (filesystem-imposed: 255 minus partition suffix overhead).
- Java AdminClient and `NewTopic` API usage is correct against current Kafka 3.x/4.x.
- The Java producer example sets `MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION = 5`, which is the maximum permitted with `enable.idempotence=true` and is what guarantees in-order delivery with retries — correct.
- `min.cleanable.dirty.ratio` default is 0.5; example value matches default.
- `segment.bytes` default is 1 GiB (1073741824); the parenthetical "(default is 1GB)" is accurate.
- The confluent-kafka-python `NewTopic(topic=, num_partitions=, replication_factor=, config=)` signature is correct.
- Strimzi `apiVersion: kafka.strimzi.io/v1beta2` is the current stable version; spec fields (`topicName`, `partitions`, `replicas`, `config`) are correct.
- Mongey/kafka Terraform provider schema (`bootstrap_servers`, `tls_enabled`, `skip_tls_verify`, `sasl_username`, `sasl_password`, `sasl_mechanism`, `kafka_topic` resource) is accurate.
- Forward-looking note for the author: a newer dedicated `kafka-get-offsets.sh` shell wrapper ships with modern Kafka and may be preferred over `kafka-run-class.sh kafka.tools.GetOffsetShell`. The wrapped form still works and was kept.
- Forward-looking note: in Kafka 3.0+, `enable.idempotence` defaults to `true`, so explicitly setting it (as the example does) is redundant but harmless and arguably useful for clarity.
