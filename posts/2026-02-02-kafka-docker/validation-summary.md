# Validation Summary: How to Use Kafka with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka (Confluent cp-kafka 7.5.0, Bitnami kafka)
- Apache Zookeeper (Confluent cp-zookeeper 7.5.0)
- Kafka KRaft mode (Raft-based consensus replacing Zookeeper)
- Docker / Docker Compose
- Confluent Schema Registry 7.5.0
- Provectus Kafka UI
- Python `kafka-python` client library
- Kafka CLI tools (kafka-topics, kafka-configs, kafka-console-producer, kafka-console-consumer, kafka-consumer-groups, kafka-broker-api-versions)

## Sources Consulted
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Confluent Platform Docker docs: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent cp-kafka image reference (7.5.0)
- Confluent Schema Registry config: https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Bitnami Kafka Docker image documentation
- kafka-python client docs: https://kafka-python.readthedocs.io/
- KRaft mode documentation (KIP-500)
- Provectus Kafka UI docs: https://docs.kafka-ui.provectus.io/

## Issues Found
- **Misleading description of KRaft mode (intro to Quick Start section):** The original text described KRaft as "embedded Zookeeper functionality." KRaft replaces Zookeeper using a Raft-based consensus protocol; it does not embed Zookeeper. Reworded to "embeds controller functionality and removes the need for Zookeeper" to accurately reflect KRaft's purpose.
- **Inconsistent comment in Topic Management Commands section:** The comment stated "Create a topic with 3 partitions and replication factor of 2," but the command used `--replication-factor 1`. Since the surrounding context describes a single-broker setup where replication factor 1 is correct, the comment was updated to "replication factor of 1" to match.

## Review Notes
- The Confluent Docker compose examples omit an explicit `KAFKA_LISTENERS` setting in the Zookeeper-based configurations. The Confluent image typically derives a default, but production setups commonly set this explicitly (e.g., `PLAINTEXT://0.0.0.0:29092,PLAINTEXT_HOST://0.0.0.0:9092`) to avoid subtle binding issues. This is a common tutorial-level simplification and was left intact.
- The `CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk` value is a valid 22-character URL-safe base64 string suitable for KRaft. Users running the example in production should generate a unique ID with `kafka-storage random-uuid`, which the comment already suggests.
- The Bitnami `docker run` quick-start lacks `KAFKA_CFG_ADVERTISED_LISTENERS`. The Bitnami image auto-derives a default that works for in-container access, but explicitly advertising `localhost:9092` makes host-machine connectivity more reliable. Left intact as it follows common Bitnami quick-start conventions.
- `confluentinc/cp-kafka:7.5.0` corresponds to Apache Kafka 3.5.x, which supports both Zookeeper and KRaft. Readers on Kafka 4.x+ should be aware that Zookeeper-based configurations are no longer supported in those versions.
- All `kafka-python` API parameters (`bootstrap_servers`, `enable_idempotence`, `acks`, `auto_offset_reset`, `session_timeout_ms`, `max_poll_interval_ms`, etc.) are valid and current for the library.
- Schema Registry env var `SCHEMA_REGISTRY_SCHEMA_COMPATIBILITY_LEVEL` is the current (non-deprecated) form for Confluent Platform 7.x; the older `SCHEMA_REGISTRY_AVRO_COMPATIBILITY_LEVEL`/`compatibility` properties are deprecated.
- Retention values verified: `KAFKA_LOG_RETENTION_HOURS: 168` = 7 days; `retention.ms=2592000000` = 30 days. Both correct.
