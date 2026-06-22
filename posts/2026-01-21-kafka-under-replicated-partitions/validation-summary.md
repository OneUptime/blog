# Validation Summary: How to Troubleshoot Kafka Under-Replicated Partitions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka CLI tools
- Kafka Java AdminClient
- Kafka JMX metrics
- Kafka broker configuration
- Prometheus alert rules

## Sources Consulted
- Apache Kafka 4.3 KRaft operations documentation: https://kafka.apache.org/43/operations/kraft/
- Apache Kafka 4.1 broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Apache Kafka Java AdminClient Javadocs for DescribeTopicsResult: https://kafka.apache.org/32/javadoc/org/apache/kafka/clients/admin/DescribeTopicsResult.html

## Issues Found
- The post used `kafka-consumer-groups.sh --describe --group __kafka_replica_fetcher` to check replica lag. Replica fetchers are broker internals, not a consumer group to inspect with `kafka-consumer-groups.sh`. Replaced those examples with broker/JMX replica lag metrics and an under-replicated-partitions watch command.
- The post used `kafka-metadata.sh` with a `--command` option and a log segment path for ISR inspection. Current Kafka provides `kafka-metadata-shell.sh`, and the shell reads a valid metadata snapshot checkpoint before interactive commands such as `cat /topics/orders/0/data`. Updated the command and shell path.
- The broker restart procedure advised removing `replication-offset-checkpoint` during a restart. This is not a normal or safe restart step and could worsen recovery if used casually. Removed that deletion from the restart example.

## Review Notes
The Java AdminClient example uses the current `allTopicNames()` API and correctly identifies under-replicated partitions by comparing ISR size to replica count. The Prometheus metric names assume a JMX exporter naming convention; exact exported names can vary with exporter configuration.
