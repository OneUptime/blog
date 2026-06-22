# Validation Summary: How to Handle Change Data Capture (CDC)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Change Data Capture (CDC)
- PostgreSQL logical replication, triggers, and polling
- Debezium PostgreSQL connector
- Kafka and Kafka Connect
- Confluent Platform Docker images
- confluent-kafka Python client
- Confluent Schema Registry Avro deserializer
- Apache Flink SQL Kafka connector and Debezium JSON format

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Apache Flink Debezium format documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/table/formats/debezium/
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Kafka listeners documentation: https://docs.confluent.io/platform/current/kafka/listeners.html
- Kafka Connect ExtractField SMT documentation: https://docs.confluent.io/kafka-connectors/transforms/current/extractfield.html
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL trigger function documentation: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html

## Issues Found
- The PostgreSQL container did not create the `myapp` database used by the Debezium connector. Added `POSTGRES_DB: myapp` so the connector target database exists.
- The Kafka Docker configuration advertised only `kafka:9092`, while the Python consumer used a host-side `localhost` bootstrap address. Added internal and host listeners and changed the host-side Python bootstrap server to `localhost:29092`.
- The Debezium connector used the obsolete `database.server.name` property alongside the current `topic.prefix` property. Removed `database.server.name`.
- The Debezium connector applied `ExtractNewRecordState`, but the Flink example used `format = 'debezium-json'`, which expects raw Debezium envelopes. Removed the unwrap transform and updated the Python consumer to read Debezium's `op`, `after`, and `before` fields.
- The query-based CDC example added `updated_at DEFAULT CURRENT_TIMESTAMP`, but that default only applies automatically on insert. Added a PostgreSQL `BEFORE UPDATE` trigger to keep `updated_at` current for polling.
- The Python consumer comment incorrectly implied manual offset commits provide exactly-once processing. Changed it to at-least-once delivery.
- The Flink/PostgreSQL example omitted PostgreSQL `REPLICA IDENTITY FULL`, which Flink documents as required to interpret PostgreSQL UPDATE and DELETE events reliably. Added the required `ALTER TABLE` statement.
- The ordering example used an `ExtractField$Key` transform without first establishing a value-to-key transform and ignored that Debezium already emits primary-key-based Kafka record keys. Replaced it with a correct Debezium primary-key note.
- The exactly-once Python example did not show the required transactional producer configuration. Added a `transactional.id` producer configuration and matching bootstrap settings.

## Review Notes
- The Docker Compose example still uses specific example image versions (`postgres:15`, `confluentinc/cp-kafka:7.5.0`, and `debezium/connect:2.4`). They are not the newest releases as of validation, but the corrected configuration is valid for the versions shown.
- The Flink JDBC sink example assumes the relevant Flink connector JARs and PostgreSQL JDBC driver are available in the Flink runtime.
