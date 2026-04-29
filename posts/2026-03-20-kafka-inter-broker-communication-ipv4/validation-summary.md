# Validation Summary: How to Configure Kafka Inter-Broker Communication on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- KRaft
- ZooKeeper
- Bash
- iptables

## Sources Consulted
- Apache Kafka 4.2 Broker Configs: https://kafka.apache.org/42/configuration/broker-configs/
- Apache Kafka 4.2 Listener Configuration: https://kafka.apache.org/42/security/listener-configuration/
- Apache Kafka 4.2 Basic Kafka Operations: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Apache Kafka 4.2 KRaft: https://kafka.apache.org/42/operations/kraft/
- Apache Kafka 4.2 Security Overview: https://kafka.apache.org/42/security/security-overview/
- Apache Kafka source, `BrokerApiVersionsCommand`: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/BrokerApiVersionsCommand.java
- Apache Kafka source, `TopicCommand`: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/TopicCommand.java
- Apache Kafka source, `ConsumerGroupCommandOptions`: https://raw.githubusercontent.com/apache/kafka/trunk/tools/src/main/java/org/apache/kafka/tools/consumer/group/ConsumerGroupCommandOptions.java

## Issues Found
- The broker examples advertised only the `CLIENT` listener. Kafka publishes `advertised.listeners` to clients and other brokers, so the `BROKER` listener also needed to be advertised for inter-broker communication to use the intended endpoint. Updated both broker examples accordingly.
- The KRaft example did not set `advertised.listeners`, which would have implicitly advertised all configured listeners. Added `advertised.listeners` for `CLIENT` and `BROKER` only so the controller listener is not advertised.
- The KRaft snippet used `controller.quorum.voters`, which represents a static controller quorum, but the comment did not say that. Updated the comment to reflect the actual configuration style.
- The `kafka-consumer-groups.sh --describe --group ...` example was labeled as replication lag monitoring, but that command reports consumer lag, not replica lag. Updated the wording to describe it correctly.
- The conclusion omitted the need to advertise both broker-facing listeners. Updated the conclusion so it matches the corrected configuration.

## Review Notes
- Kafka 4.1+ also supports dynamic KRaft controller quorums with `controller.quorum.bootstrap.servers`; the post's `controller.quorum.voters` example is still valid for a static quorum.
- The listener examples use `PLAINTEXT`. This is valid, but it provides no encryption or authentication. For stronger broker-to-broker security, Kafka's official security docs recommend SSL or SASL-based listeners.
