# Validation Summary: How to Fix Kafka NotLeaderForPartition Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer and consumer clients
- Kafka AdminClient
- Kafka command-line tools
- Confluent Kafka Python client
- Kafka broker, producer, and consumer configuration

## Sources Consulted
- Apache Kafka 4.1 KRaft operations documentation: https://kafka.apache.org/41/operations/kraft/
- Apache Kafka 4.1 Quick Start CLI examples: https://kafka.apache.org/41/getting-started/quickstart/
- Apache Kafka 4.1 producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka 4.1 broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka Java Admin client Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka NotLeaderOrFollowerException Javadoc: https://kafka.apache.org/27/javadoc/org/apache/kafka/common/errors/NotLeaderOrFollowerException.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- librdkafka configuration reference: https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md

## Issues Found
- The post only referenced `NotLeaderForPartitionException`, but Kafka 2.6 and later use `NotLeaderOrFollowerException` in the Java client for the current error name. Added the modern exception name and updated Java handling to catch both old and current forms.
- The KRaft controller status command used `kafka-metadata.sh --command controllers`, which is not the current Kafka CLI for checking the active metadata quorum controller. Replaced it with `kafka-metadata-quorum.sh --bootstrap-server localhost:9092 describe --status`.
- The Java retry helper only inspected the immediate exception cause, so it could miss wrapped Kafka retriable exceptions. Updated it to walk the cause chain and include `NotLeaderOrFollowerException`.
- The Java consumer example forced a group unsubscribe/resubscribe to refresh metadata. Replaced that with `consumer.partitionsFor(topic, Duration.ofSeconds(10))`, which requests topic metadata without causing an unnecessary rebalance.
- The Java monitor started a scheduler but did not stop it in `close()`. Added a scheduler field and shutdown call.
- The Python producer treated asynchronous delivery failures as if they would be raised directly by `produce()` or `flush()`. Updated the example to capture delivery errors from the callback after `flush()` and retry retriable delivery failures.
- The Python consumer checked only `KafkaError.NOT_LEADER_FOR_PARTITION`. Updated it to also handle `KafkaError.NOT_LEADER_OR_FOLLOWER` when available.
- The broker configuration snippet included `leader.imbalance.per.broker.percentage`, which is not present in the current Apache Kafka 4.1 broker configuration reference. Replaced it with `auto.leader.rebalance.enable=true` alongside the current `leader.imbalance.check.interval.seconds` setting.

## Review Notes
The post remains a practical troubleshooting guide rather than a version-specific reference. Future updates could mention that the Java producer already refreshes metadata automatically for invalid metadata errors, so explicit metadata lookups are usually supplemental rather than the primary recovery mechanism.
