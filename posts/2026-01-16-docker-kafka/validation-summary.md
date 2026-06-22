# Validation Summary: How to Set Up Apache Kafka in Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Docker Compose
- Confluent Platform Docker images
- ZooKeeper
- KRaft
- Kafka UI
- Confluent Schema Registry
- Kafka command-line tools

## Sources Consulted
- Confluent Docker Image Configuration Reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Developer tutorial, "How to run Kafka locally with Docker": https://developer.confluent.io/confluent-tutorials/kafka-on-docker/
- Confluent Kafka Command-Line Interface Tools documentation: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Confluent KRaft migration documentation: https://docs.confluent.io/platform/current/installation/migrate-zk-kraft.html
- Apache Kafka documentation: https://kafka.apache.org/documentation/

## Issues Found
- The ZooKeeper-based Kafka snippets advertised `PLAINTEXT://...:29092` and `PLAINTEXT_HOST://...:9092` but did not define matching `KAFKA_LISTENERS`. Added `KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:29092,PLAINTEXT_HOST://0.0.0.0:9092` to the single-broker, multi-broker, and complete setup examples so both listener names are configured and the advertised internal Docker endpoint is actually bound.
- The topic management commands used `docker exec kafka ...`, but Docker Compose does not guarantee a container named exactly `kafka` unless `container_name` is set. Changed the commands to `docker compose exec kafka ...`, which targets the Compose service used in the examples.
- The post presented ZooKeeper mode without a current Confluent Platform caveat. Added a note that the ZooKeeper examples are for Confluent Platform 7.5.0 and that Confluent Platform 8.0 and later require KRaft.

## Review Notes
- The KRaft example uses combined broker/controller mode, which Confluent documents as suitable for local experimentation rather than production. The post labels it as a setup example rather than a production KRaft architecture.
- The "Complete Production Setup" remains a simplified single-broker example with plaintext listeners and replication factor 1. It is syntactically valid, but a real production Kafka deployment should use multiple brokers, durable storage planning, security, monitoring, and supported KRaft controller topology.
