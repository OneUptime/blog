# Validation Summary: How to Configure Kafka Log Retention Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka topic retention configuration
- Apache Kafka broker configuration
- Kafka command-line tools (`kafka-topics.sh`, `kafka-configs.sh`, `kafka-log-dirs.sh`)
- Kafka Java Admin API
- Confluent Kafka Python AdminClient
- Kafka log compaction and JMX metrics

## Sources Consulted
- Apache Kafka 4.1 Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 Basic Kafka Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka 4.1 Java Admin API Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka Python ConfigResource and ConfigEntry source docs: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/_modules/confluent_kafka/admin/_config.html
- Confluent Kafka log and network metrics documentation: https://docs.confluent.io/platform/current/kafka/log-network-metrics.html

## Issues Found
- The broker-level segment roll example used `log.segment.ms`, which is not the broker property documented by Kafka. Changed it to `log.roll.ms`, the broker-level default property for topic `segment.ms`.
- The Java Admin API snippets used `ConfigResource` without importing `org.apache.kafka.common.config.ConfigResource`. Added the missing imports so the snippets compile.
- The Python `update_retention` method built a configuration dictionary but called `alter_configs` with a `ConfigResource` that had no config attached. It also used the deprecated full-replacement API. Changed it to use `ConfigEntry` values with `AlterConfigOpType.SET` and `incremental_alter_configs`.
- Removed an unused `time` import from the Python example after fixing the import block.
- The retention flow diagram said the log cleaner deletes segments for delete retention. Changed the label to "Broker Deletes Segments" because Kafka's log cleaner is specifically associated with compaction, while delete retention removes old segments according to the delete policy.

## Review Notes
- The examples assume a Kafka version new enough to support `--bootstrap-server` CLI usage and incremental alter configs. Kafka's Java `incrementalAlterConfigs` is supported by brokers 2.3.0 and newer.
- `retention.bytes` is correctly described as a per-partition limit, not a whole-topic limit.
- The Python code was syntax-checked with `ast.parse`; no live Kafka cluster was available for end-to-end execution.
