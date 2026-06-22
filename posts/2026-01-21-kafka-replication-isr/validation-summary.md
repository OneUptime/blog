# Validation Summary: How to Set Up Kafka Replication and ISR

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Kafka replication
- Kafka In-Sync Replicas (ISR)
- Kafka broker and topic configuration
- Kafka producer configuration
- Kafka CLI tools
- Kafka AdminClient Java API

## Sources Consulted
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka 4.1 Producer Configs: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka 4.1 Basic Kafka Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka 4.1 Admin API Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html

## Issues Found
- Corrected the ISR definition to include the leader, not only followers, because Kafka's ISR is the set of in-sync replicas for the partition including the leader.
- Removed `replica.lag.max.messages` from the broker configuration and ISR membership criteria because it is not present in current Kafka broker configuration documentation.
- Updated the ISR membership explanation to use `replica.lag.time.max.ms` behavior instead of referring to ZooKeeper sessions, which is outdated for modern KRaft-based Kafka clusters.
- Clarified that idempotent producers avoid duplicate writes from retries; idempotence alone is not a complete exactly-once processing guarantee.
- Added missing Java imports for `Node` and `TopicPartitionInfo` so the AdminClient example is syntactically complete.
- Corrected the `acks=all` and `min.insync.replicas` example: when all three replicas are in ISR, all three in-sync replicas must acknowledge the write; `min.insync.replicas` is the minimum ISR size required for writes to proceed.
- Fixed the leader distribution shell command so it extracts the value after the `Leader:` field instead of the partition id.
- Added the missing `--bootstrap-server localhost:9092` option to the best-practices `kafka-topics.sh --create` command.

## Review Notes
The post is now technically accurate for current Apache Kafka documentation. Some operational examples remain intentionally simplified, such as replication lag monitoring via JMX or external metrics, but they are framed as placeholders rather than complete implementations.
