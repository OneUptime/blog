# Validation Summary: How to Run Kafka in Docker and Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka KRaft mode
- Docker
- Docker Compose
- Kafka UI
- Confluent Schema Registry
- Python Kafka clients
- Java Kafka clients

## Sources Consulted
- Apache Kafka Docker image documentation: https://kafka.apache.org/41/getting-started/docker/
- Apache Kafka Docker Hub image documentation: https://hub.docker.com/r/apache/kafka
- Apache Kafka generated configuration reference: https://kafka.apache.org/documentation/
- Docker Compose documentation: https://docs.docker.com/compose/
- Docker Compose file reference for the obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Schema Registry configuration reference: https://docs.confluent.io/platform/current/schema-registry/installation/config.html
- Kafka UI project documentation: https://github.com/provectus/kafka-ui
- Kafka UI configuration documentation: https://github.com/provectus/kafka-ui-docs/blob/main/configuration/configuration-wizard.md
- Apache Kafka Java client documentation: https://kafka.apache.org/documentation/

## Issues Found
- The article described the multi-broker example as production-ready. The shown Docker Compose setup is more accurately production-like for development and testing, so the wording was corrected.
- The Compose snippets used the top-level `version: '3.8'` field. Docker Compose now treats this field as obsolete and always uses the current Compose Specification, so the field was removed from the examples.
- The commands used the legacy `docker-compose` executable even though the prerequisites call for Docker Compose 2.x. Docker Compose V2 is invoked as `docker compose`, so the command examples were updated.
- The multi-broker Kafka example exposed host ports but advertised only Docker-network hostnames such as `kafka-1:9092`. Host clients would fail after bootstrap because Kafka metadata would point them to names that are not resolvable from the host. The broker listener configuration was updated to include separate internal and host listeners.
- The Schema Registry example configured `SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS` as `kafka:9092`. Confluent's documented `kafkastore.bootstrap.servers` format includes the security protocol, so it was changed to `PLAINTEXT://kafka:9092`.
- The command reference suggested scaling Kafka with `docker compose up -d --scale kafka=3`. Kafka brokers need unique node IDs and listener/advertised-listener configuration, so this was replaced with starting separately defined broker services.

## Review Notes
- The Kafka examples use plaintext listeners and are appropriate for local development or production-like learning environments, not a complete secure production deployment.
- The multi-broker example still uses KRaft combined broker/controller nodes. This can be useful for compact local clusters, but production KRaft deployments generally separate broker and controller roles.
- The Python examples assume the `kafka-python` package is installed. The post does not include dependency installation commands.
