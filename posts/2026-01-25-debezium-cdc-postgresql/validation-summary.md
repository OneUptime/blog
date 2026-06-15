# Validation Summary: How to Stream Changes with Debezium CDC in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL logical replication
- Debezium PostgreSQL connector
- Apache Kafka
- Kafka Connect
- Docker Compose
- Python Kafka consumers

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium installation and container image documentation: https://debezium.io/documentation/reference/stable/install.html
- Debezium message filtering SMT documentation: https://debezium.io/documentation/reference/stable/transformations/filtering.html
- PostgreSQL logical replication configuration documentation: https://www.postgresql.org/docs/current/logical-replication-config.html
- PostgreSQL replication server settings documentation: https://www.postgresql.org/docs/current/runtime-config-replication.html
- Apache Kafka quickstart documentation: https://kafka.apache.org/quickstart/
- Apache Kafka Connect user guide: https://kafka.apache.org/40/kafka-connect/user-guide/
- Confluent Kafka CLI tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found
- The post claimed CDC provides "guaranteed ordering" without qualification. Changed it to ordered events within each Kafka topic partition, which matches Kafka's ordering model.
- The PostgreSQL permissions example did not account for Debezium's publication requirements when using `pgoutput`. Added `CREATE` on the database, noted table ownership requirements for automatic publication management, and added a manual `CREATE PUBLICATION` example.
- The connector configuration named a publication but did not state whether Debezium should create it. Added `publication.autocreate.mode: disabled` to match the manual publication setup.
- The Docker Compose example used `docker exec -it kafka` later, but the Kafka service did not define a stable container name. Added `container_name: kafka`.
- The Kafka broker configuration advertised internal and host listeners but did not explicitly bind both listeners. Added `KAFKA_LISTENERS`.
- The Debezium image used the old Docker Hub style `debezium/connect:2.4`. Updated examples to `quay.io/debezium/connect:3.5`, matching current Debezium image publishing and stable docs.
- The sample event version still showed Debezium `2.4.0`. Updated it to `3.5.0` to match the connector image used in the article.
- The Filter SMT example omitted the requirement for Debezium's scripting SMT artifact and a JSR-223 engine such as Groovy. Added that caveat before the example.
- The snapshot mode list included deprecated or removed guidance: `never` and `exported`. Replaced it with current `no_data` and `initial_only` modes.
- The "Exactly-Once Semantics" section implied that a simple Python consumer with manual commits provides exactly-once processing. Renamed the section to "Idempotent Processing" and clarified that end-to-end exactly-once behavior requires transactional Kafka producers or idempotent downstream writes.

## Review Notes
The tutorial is technically relevant and now aligns with current Debezium 3.5 and PostgreSQL logical replication documentation. The Docker Compose stack remains a local learning setup, not a production reference architecture.
