# Validation Summary: How to Handle Kafka Broker Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka broker replication and leader election
- Kafka KRaft and ZooKeeper broker configuration
- Kafka AdminClient Java API
- Confluent Kafka Python client
- Kafka CLI tools
- Prometheus alerting for Kafka

## Sources Consulted
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 3.9 generated broker configuration reference: https://kafka.apache.org/39/generated/kafka_config.html
- Apache Kafka Basic Operations: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka 4.1 AdminClient / Admin Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka 4.1 `DescribeTopicsResult` Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/DescribeTopicsResult.html
- Apache Kafka 4.1 `NewPartitionReassignment` Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/NewPartitionReassignment.html
- Apache Kafka 4.1 ProducerConfig Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/ProducerConfig.html
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka monitoring with JMX documentation: https://docs.confluent.io/platform/current/kafka/monitoring.html

## Issues Found
- The ISR description said only caught-up replicas can become leaders without mentioning unclean leader election. Qualified the statement to apply when `unclean.leader.election.enable=false`, because Kafka can elect a non-ISR replica as a last resort when unclean leader election is enabled.
- The KRaft configuration block used only controller quorum election/fetch settings under a broker failure detection comment. Added `broker.heartbeat.interval.ms` and `broker.session.timeout.ms`, and clarified that the controller quorum settings are for controller quorum elections.
- The Java controller failover example omitted required imports and did not close the AdminClient. Added the imports and wrapped the AdminClient in try-with-resources.
- The multiple-broker-failure example warned that the cluster may lose quorum based only on active broker count. Changed this to unavailable partitions, because Kafka quorum depends on the ZooKeeper ensemble or KRaft controller quorum rather than a simple majority of brokers.
- The broker replacement example claimed a new broker would automatically receive replicas after discovering affected partitions. Updated it to build and execute `alterPartitionReassignments(...)` with `NewPartitionReassignment`, replacing the failed broker ID with the new broker ID.
- The Prometheus `KafkaBrokerDown` alert used `kafka_server_replicamanager_leadercount == 0`, which can be true for a healthy broker with no partition leaders and may disappear when a broker is down. Changed it to a scrape-target availability check using `up{job="kafka"} == 0`.

## Review Notes
Kafka 4.x is KRaft-only, while the post still includes ZooKeeper-mode guidance for older or migrating deployments. That is acceptable for a broad broker-failure guide, but future revisions should state the target Kafka version range explicitly.
