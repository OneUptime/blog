# Validation Summary: How to Fix 'InvalidReplicationFactorException' in Kafka

## Status
validated

## Post Type
Troubleshooting guide / technical tutorial

## Technologies Covered
- Apache Kafka
- Kafka CLI tools
- Kafka KRaft metadata tools
- Kafka broker configuration
- Java Kafka AdminClient
- Python confluent-kafka AdminClient
- Spring Kafka
- KafkaJS
- kcat

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Apache Kafka broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/43/operations/kraft/
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Confluent dynamic broker configuration documentation: https://docs.confluent.io/platform/current/kafka/dynamic-config.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Spring Kafka topic configuration documentation: https://docs.spring.io/spring-kafka/reference/kafka/configuring-topics.html
- KafkaJS Admin Client documentation: https://kafka.js.org/docs/admin

## Issues Found
- The broker-discovery comment incorrectly said `kafka-broker-api-versions.sh --bootstrap-server` connects to ZooKeeper. It connects to Kafka through the bootstrap server, so the comment was corrected.
- The KRaft metadata example used a non-existent `kafka-metadata.sh --command "broker-ids"` form. It was changed to the documented `kafka-metadata-shell.sh --snapshot ...` workflow with an interactive `ls /brokers` prompt.
- The default replication factor diagnostic command implied `kafka-configs.sh --entity-default --describe` retrieves the static broker value. The text now checks `server.properties` for the static value and uses `kafka-configs.sh` only for dynamic overrides.
- The dynamic configuration section claimed `default.replication.factor` can be updated without restarting. Apache Kafka documents this setting as read-only, so the section now instructs editing `server.properties` and restarting brokers.
- The broker addition snippet used `broker.id` as the generic unique ID. The KRaft-specific guidance now includes `node.id` and `process.roles=broker`, while preserving `broker.id` for ZooKeeper-based clusters.
- The KafkaJS sample connected the same admin client inside `getAvailableBrokers()` even though callers already connect before invoking it. The helper now only calls `describeCluster()`, matching the surrounding connection lifecycle.

## Review Notes
The remaining examples are broadly accurate for current Kafka client APIs. For future updates, consider adding version notes because Apache Kafka 4.x is KRaft-only while older 3.x deployments may still use ZooKeeper during migration.
