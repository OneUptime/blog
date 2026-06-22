# Validation Summary: How to Set Up Kafka Topic Configuration Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka topics
- Kafka CLI tools (`kafka-topics.sh`, `kafka-configs.sh`)
- Kafka topic-level configuration
- Kafka retention, replication, compaction, compression, and message size settings

## Sources Consulted
- Apache Kafka 4.1 Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka 4.1 Basic Kafka Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka 4.1 Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka 4.1 Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Confluent Kafka CLI Tools reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found
- The post listed `none` as a topic-level `compression.type` value. Apache Kafka's topic configuration reference documents `uncompressed`, `zstd`, `lz4`, `snappy`, `gzip`, and `producer` as valid topic-level values. Changed the compression options list, compression comparison table, and best-practices summary from `none` to `uncompressed`.

## Review Notes
The Kafka topic creation, topic alteration, retention, segment, compaction, replication, monitoring, and message-size configuration examples use current Kafka CLI flags and topic-level configuration names. Partition counts and compression ratios are workload-dependent recommendations, not universal constants, so they should be benchmarked for production workloads.
