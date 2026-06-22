# Validation Summary: How to Stream Data from PostgreSQL to Kafka with Debezium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL logical replication
- Apache Kafka
- Kafka Connect
- Debezium PostgreSQL connector
- Debezium ExtractNewRecordState SMT
- Docker Compose
- Python Kafka consumer
- Java Kafka consumer
- Prometheus JMX exporter
- Confluent Schema Registry and Avro converter

## Sources Consulted
- Debezium PostgreSQL connector documentation 3.5: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium New Record State Extraction SMT documentation 3.5: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Apache Kafka Docker image documentation: https://hub.docker.com/r/apache/kafka
- PostgreSQL logical replication configuration documentation: https://www.postgresql.org/docs/current/logical-replication-config.html
- PostgreSQL CREATE PUBLICATION documentation: https://www.postgresql.org/docs/current/sql-createpublication.html
- Kafka Connect offset management documentation: https://docs.confluent.io/platform/current/connect/references/restapi.html

## Issues Found
- The Docker Compose Kafka listener advertised only `kafka:9092`, which breaks host clients using `localhost:9092`. Updated the listener configuration to expose separate internal and host listeners, and updated Kafka Connect to use the internal listener.
- The Debezium Connect image was pinned to 2.4 while the post targets current configuration guidance. Updated it to `quay.io/debezium/connect:3.5` and aligned the example event version.
- The production configuration used obsolete Debezium heartbeat and ExtractNewRecordState delete handling properties. Replaced them with `topic.heartbeat.prefix` and `transforms.unwrap.delete.tombstone.handling.mode`.
- The Java consumer example was missing required imports and did not handle Jackson's checked exception. Added the missing imports, `throws Exception`, and minimal handler stubs so the example is syntactically complete.
- The snapshot mode table listed obsolete or incorrect modes for current Debezium PostgreSQL documentation. Replaced `exported`, added current modes, and marked `never` as deprecated in favor of `no_data`.
- The schema changes section implied PostgreSQL DDL events can be emitted by Debezium. Corrected it to state that PostgreSQL logical decoding does not emit DDL events and replaced the invalid schema history configuration with `schema.refresh.mode`.
- The Prometheus metric names did not match the configured JMX exporter rule output. Updated the listed metric names to match Debezium's documented JMX attribute names.
- The offset reset instructions incorrectly suggested deleting the connector or recreating it with `snapshot.mode=initial` as the reset mechanism. Updated them to use Kafka Connect's connector stop and offset reset REST endpoints.
- The summary table recommended deprecated `snapshot.mode=never`. Updated it to `snapshot.mode=no_data`.

## Review Notes
The examples are now aligned with Debezium 3.5 documentation. The Schema Registry snippet uses Confluent converter classes and assumes those converter plugins are installed in the Kafka Connect image.
