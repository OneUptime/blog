# Validation Summary: How to Configure Kafka Schema Registry to Listen on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Confluent Schema Registry
- Avro
- Debian/Ubuntu APT package management
- Java Kafka producer configuration
- Schema Registry REST API

## Sources Consulted
- Confluent Platform Debian/Ubuntu installation docs: https://docs.confluent.io/platform/current/installation/installing_cp/deb-ubuntu.html
- Confluent Platform package reference: https://docs.confluent.io/platform/current/installation/available_packages.html
- Schema Registry configuration reference: https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Schema Registry API usage examples: https://docs.confluent.io/platform/current/schema-registry/develop/using.html
- Schema evolution and compatibility docs: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Avro serializer/deserializer docs: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html

## Issues Found
- The installation snippet used `apt-key` and a `7.5` archive repository path. `apt-key` is deprecated, and the repo example was not aligned with Confluent's current Debian/Ubuntu installation guidance. I replaced it with a keyring-based APT setup and updated the repository path to the current documented Confluent Platform package repository.
- The `kafkastore.bootstrap.servers` example omitted the transport prefix. I updated it to `PLAINTEXT://...` to match the documented Schema Registry configuration format and make the broker security mode explicit.
- The `schema.compatibility.level` example used `BACKWARD` in uppercase. I changed it to the documented lowercase config value `backward`.
- The startup verification example queried `/`, which is not the documented REST API endpoint used in Confluent's examples. I changed it to query `/subjects`, which is documented and returns JSON reliably.

## Review Notes
- `kafkastore.topic.replication.factor=3` is technically valid, but it requires a Kafka cluster with at least three brokers. The post shows two bootstrap addresses, which is fine because bootstrap servers do not need to list every broker, but readers should ensure their actual cluster size supports the configured replication factor.
