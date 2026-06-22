# Validation Summary: How to Set Up Kafka Connect for Database CDC with Debezium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Debezium
- PostgreSQL logical replication
- MySQL binary log CDC
- Docker Compose
- Java Kafka consumer
- Python confluent-kafka consumer
- Kafka Connect REST API

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- Debezium message filtering SMT documentation: https://debezium.io/documentation/reference/stable/transformations/filtering.html
- Apache Kafka Docker documentation: https://kafka.apache.org/41/getting-started/docker/
- Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Red Hat build of Debezium 2.5 transformation documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_debezium/2.5.4/html/debezium_user_guide/applying-transformations-to-modify-messages-exchanged-with-kafka

## Issues Found
- The Kafka Docker Compose configuration advertised only `kafka:9092`, which breaks host-side consumers that connect to `localhost:9092`. Updated the Kafka listeners to expose `localhost:9092` for host clients and `kafka:29092` for containers, and updated Kafka Connect and MySQL schema history bootstrap servers accordingly.
- The PostgreSQL connector used `heartbeat.topics.prefix`, which has been replaced by `topic.heartbeat.prefix` in current Debezium documentation. Updated both heartbeat examples.
- The PostgreSQL connector included `delete.handling.mode` at connector level. That option is for the event-flattening SMT and is deprecated in Debezium 2.5 in favor of `delete.tombstone.handling.mode`. Removed it from the base connector config.
- The SMT example used deprecated `drop.tombstones` and `delete.handling.mode` options. Replaced them with `transforms.unwrap.delete.tombstone.handling.mode`.
- The Java and Python consumers did not handle tombstone records even though the connector emits tombstones on delete. Added null-value checks before JSON parsing.
- The SMT JSON example used an ellipsis, making the snippet invalid JSON. Replaced it with concrete connector fields.
- The snapshot mode table listed `schema_only`, which is deprecated in favor of `no_data`. Updated the table entry.
- The offset reset command omitted the required stopped connector state. Added the REST call to stop the connector before deleting offsets.
- The Filter SMT example did not mention that the scripting SMT artifact and a JSR-223 engine must be installed. Added a short prerequisite sentence.
- The schema-change best-practice heading was too broad for a MySQL-specific schema history configuration. Renamed it to clarify that the snippet applies to MySQL schema changes.

## Review Notes
The post is technically valid after the fixes. The examples remain development-oriented; production deployments should also address authentication, TLS, connector ACLs, topic replication factors greater than 1, and database user privileges scoped more narrowly than the tutorial defaults.
