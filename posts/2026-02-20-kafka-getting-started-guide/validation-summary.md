# Validation Summary: How to Get Started with Apache Kafka for Event Streaming

## Status
validated

## Post Type
Tutorial / getting-started guide

## Technologies Covered
- Apache Kafka
- Kafka KRaft mode
- Docker Compose
- Kafka command-line tools
- Python
- confluent-kafka Python client
- Mermaid diagrams

## Sources Consulted
- Apache Kafka Docker image documentation: https://hub.docker.com/r/apache/kafka
- Apache Kafka downloads page for current release and Docker image tag: https://kafka.apache.org/community/downloads/
- Apache Kafka basic operations documentation for `kafka-topics.sh`: https://kafka.apache.org/43/operations/basic-kafka-operations/
- Apache Kafka producer configuration documentation: https://kafka.apache.org/37/configuration/producer-configs/
- Docker documentation, Kafka guide: https://docs.docker.com/guides/kafka/
- Confluent Python client documentation: https://docs.confluent.io/kafka-clients/python/current/overview.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found
- The Docker image was pinned to `apache/kafka:3.7.0`, which is outdated as of the validation date. Updated it to the current official Apache Kafka Docker image tag, `apache/kafka:4.3.0`.
- The Docker Compose KRaft configuration omitted `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP` and single-node replication settings for internal topics. Added the listener security protocol map and set offsets/transaction state replication factors and minimum ISR to `1`, matching the official single-node combined-mode pattern.
- The Docker Compose snippet included a top-level `version` field, which current Docker Compose treats as obsolete. Removed it.
- The topic creation command used `docker exec -it kafka`, but the Compose file did not define `container_name: kafka`, so that container name is not guaranteed to exist. Changed it to `docker compose exec kafka` and used the official script path `/opt/kafka/bin/kafka-topics.sh`.
- The overview described Kafka ordering without the partition scope. Clarified that ordering is within each partition.
- The producer explanation said Kafka would round-robin when no key is specified. Modern Kafka's default producer partitioning uses the default partitioner, including sticky partitioning for records without a key, unless configured otherwise. Reworded this to avoid the inaccurate round-robin claim.

## Review Notes
- The Python producer and consumer examples use current `confluent-kafka` APIs and are syntactically valid.
- The consumer example relies on the client's default automatic offset commit behavior. That is acceptable for a beginner tutorial, while the later configuration table correctly notes that disabling auto-commit gives more control.
