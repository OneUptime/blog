# Validation Summary: How to Sync Redis Cache with MySQL Changes (CDC)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (caching layer)
- MySQL (binlog / binary log replication)
- Debezium (CDC connector for MySQL)
- Apache Kafka (event streaming)
- Python (kafka-python, redis-py libraries)
- Kafka Connect

## Sources Consulted
- Debezium 2.0.0.Final release blog — https://debezium.io/blog/2022/10/17/debezium-2-0-final-released/
- Debezium 2.0.0.Beta2 release blog (property namespace changes) — https://debezium.io/blog/2022/09/16/debezium-2.0-beta2-released/
- Debezium MySQL Connector documentation (2.x) — https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Confluent documentation on Debezium v2 breaking changes — https://docs.confluent.io/cloud/current/connectors/cc-mysql-source-cdc-v2-debezium/cc-debezium-v2-backward-incompatible-changes.html
- MySQL binary log documentation — https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- kafka-python library documentation — https://kafka-python.readthedocs.io/

## Issues Found

### 1. Architecture diagram: incorrect Kafka topic name
- **What was wrong:** The architecture diagram showed the topic name as `db.myapp.users`, but Debezium's topic naming convention is `{topic.prefix}.{database}.{table}`. With the connector config setting the prefix to `myapp` and database `myapp`, the correct topic name is `myapp.myapp.users` (which the Python consumer code already used correctly).
- **What was changed:** Updated the diagram from `db.myapp.users` to `myapp.myapp.users`.
- **Why:** Consistency between the diagram and the actual consumer code, and accuracy with Debezium's topic naming convention.

### 2. Debezium connector config: deprecated 1.x property names (breaking in 2.x)
- **What was wrong:** Three connector properties used Debezium 1.x names that are **not backward-compatible** in Debezium 2.x (released October 2022):
  - `database.server.name` (removed in 2.x)
  - `database.history.kafka.bootstrap.servers` (removed in 2.x)
  - `database.history.kafka.topic` (removed in 2.x)
- **What was changed:** Updated to the Debezium 2.x equivalents:
  - `database.server.name` -> `topic.prefix`
  - `database.history.kafka.bootstrap.servers` -> `schema.history.internal.kafka.bootstrap.servers`
  - `database.history.kafka.topic` -> `schema.history.internal.kafka.topic`
- **Why:** Debezium 2.x has been the current major version since late 2022. The old property names are breaking changes (not deprecated aliases), so the original config would fail on any Debezium 2.x deployment.

## Review Notes
- The Python consumer code assumes the Kafka Connect JSON converter is configured with `schemas.enable=false` (i.e., no `schema`/`payload` envelope wrapping). This is a common and reasonable setup for tutorials, but production deployments may use schema-enabled converters, in which case the consumer would need to unwrap `message.value["payload"]` first. This is not an error but could be noted for readers using default converter settings.
- The `kafka-python` library (`from kafka import KafkaConsumer`) is functional but has had periods of slow maintenance. The `confluent-kafka` Python client is generally recommended for production use. This is a stylistic choice, not an error.
- The `safe_sync` function in the "Handling Schema Changes" section catches `KeyError` but labels it "Schema mismatch" — a `KeyError` from a missing dict key is a reasonable proxy for schema evolution issues, though it's a simplification. Acceptable for a tutorial.
