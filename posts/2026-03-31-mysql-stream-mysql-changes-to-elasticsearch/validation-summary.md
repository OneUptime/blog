# Validation Summary: How to Stream MySQL Changes to Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (binary log / CDC)
- Apache Kafka (Confluent Platform 7.6.0)
- Apache ZooKeeper
- Kafka Connect
- Debezium 2.6 (MySQL Source Connector)
- Confluent Elasticsearch Sink Connector
- Elasticsearch 8.13.0
- Docker Compose

## Sources Consulted
- Debezium 2.6 MySQL Connector documentation (https://debezium.io/documentation/reference/2.6/connectors/mysql.html)
- Debezium Docker image documentation (https://debezium.io/documentation/reference/2.6/operations/debezium-server.html)
- Confluent Elasticsearch Sink Connector documentation (https://docs.confluent.io/kafka-connectors/elasticsearch/current/overview.html)
- Elasticsearch 8.13 removal of mapping types documentation (https://www.elastic.co/guide/en/elasticsearch/reference/8.13/removal-of-types.html)
- Confluent Platform Docker configuration reference (https://docs.confluent.io/platform/current/installation/docker/config-reference.html)
- Debezium ExtractNewRecordState SMT documentation (https://debezium.io/documentation/reference/2.6/transformations/event-flattening.html)

## Issues Found

1. **Missing ZooKeeper service in Docker Compose**: The Kafka service referenced `zookeeper:2181` but no ZooKeeper service was defined in the compose file, making it non-functional. Added a `zookeeper` service using `confluentinc/cp-zookeeper:7.6.0` and added `depends_on: [zookeeper]` to the Kafka service.

2. **`type.name: _doc` in Elasticsearch Sink config**: Elasticsearch 8.x fully removed mapping types. The `type.name` configuration property is deprecated/unnecessary for ES 8.x and the Confluent connector version 14.x. Removed the `type.name` setting from the sink connector configuration.

3. **Inaccurate claim about Kafka Connect**: The post stated "All three components run inside Kafka Connect" but Kafka topics run on the Kafka broker, not inside Kafka Connect. Only the source and sink connectors run inside Kafka Connect. Changed to: "The source and sink connectors both run inside Kafka Connect."

4. **Missing STATUS_STORAGE_TOPIC**: The Debezium connect service was missing the `STATUS_STORAGE_TOPIC` environment variable. While Debezium's Docker image provides a default, explicitly setting it is best practice for tutorials. Added `STATUS_STORAGE_TOPIC: connect_statuses`.

## Review Notes
- The `confluentinc/kafka-connect-elasticsearch:14.0.12` version could not be independently confirmed to exist. The 14.0.x series is valid, but readers should verify the exact patch version on Confluent Hub if it fails to install.
- The Docker Compose file uses ZooKeeper-based Kafka. Confluent Platform 7.6.0 supports KRaft mode (no ZooKeeper), which is the recommended approach for new deployments. A future update could migrate to KRaft.
- The `docker-compose.yml` uses the deprecated `version: "3.8"` top-level key, which is ignored by modern Docker Compose but harmless.
- The post does not create the `debezium` MySQL user or the `products` table, which readers would need to do before the connector registration step. This is an omission of setup steps rather than a technical error.
