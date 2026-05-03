# Validation Summary: How to Deploy Kafka via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Apache Kafka 3.7.0 (KRaft mode, no ZooKeeper)
- Portainer (Docker stack management UI)
- Docker Compose
- provectuslabs/kafka-ui (Kafka management UI)
- Apache Kafka CLI tools (kafka-topics.sh, kafka-console-producer.sh, kafka-console-consumer.sh, kafka-configs.sh)

## Sources Consulted
- Apache Kafka 3.7.0 default KRaft server config: https://raw.githubusercontent.com/apache/kafka/3.7.0/config/kraft/server.properties
- Apache Kafka 3.7.0 official Docker image (JVM) Dockerfile: https://github.com/apache/kafka/blob/3.7.0/docker/jvm/Dockerfile
- Apache Kafka Docker launch / configureDefaults scripts: https://raw.githubusercontent.com/apache/kafka/3.7.0/docker/resources/common-scripts/configureDefaults and https://raw.githubusercontent.com/apache/kafka/3.7.0/docker/jvm/launch
- KafkaDockerWrapper (auto storage formatting): https://raw.githubusercontent.com/apache/kafka/3.7.0/core/src/main/scala/kafka/docker/KafkaDockerWrapper.scala
- Apache Kafka KRaft documentation: https://kafka.apache.org/37/documentation.html#kraft
- provectuslabs/kafka-ui official compose example: https://raw.githubusercontent.com/provectus/kafka-ui/master/documentation/compose/kafka-ui.yaml

## Issues Found
1. **Missing `KAFKA_LOG_DIRS` env var (data persistence broken).** The post mounted the named volume `kafka_data` at `/var/lib/kafka/data`, but the `apache/kafka:3.7.0` image's default `log.dirs` is `/tmp/kraft-combined-logs`. As written, Kafka would write all topic data and KRaft metadata to `/tmp` inside the container, and the mounted volume would stay empty — meaning topic data and offsets would be lost on `docker compose down && up`. Fix: added `KAFKA_LOG_DIRS: /var/lib/kafka/data` to the broker's `environment:` block so the data is actually written to the persistent volume. Note: the `apache/kafka` image does declare `/var/lib/kafka/data` as a `VOLUME` in the Dockerfile, which is presumably what the author was relying on — but declaring a volume does not change Kafka's `log.dirs` setting.

2. **Kafka shell scripts not on PATH in `apache/kafka:3.7.0`.** Unlike the Confluent image, the official `apache/kafka` image does not add `/opt/kafka/bin` to PATH. Bare invocations like `kafka-topics.sh ...` would fail with `command not found`. Fixed in three places:
   - The container `healthcheck` test now uses the full path `/opt/kafka/bin/kafka-topics.sh`.
   - All commands in the "Verify Kafka via Portainer Console" section now use `/opt/kafka/bin/...`.
   - All commands in the "Common Kafka Configuration" section now use `/opt/kafka/bin/...`.

## Review Notes
- The `apache/kafka:3.7.0` image auto-generates a `CLUSTER_ID` and auto-formats KRaft storage on first run if `CLUSTER_ID` is not provided, so the compose works as a quick-start. For a stable production deployment, users should set their own `CLUSTER_ID` (generated once via `/opt/kafka/bin/kafka-storage.sh random-uuid`) so the cluster identity is pinned and not dependent on the image's built-in default. Left unchanged since the post targets dev / small-prod use.
- `version: "3.8"` at the top of the compose file is now considered obsolete by Compose v2 (it logs a warning) but still works. Left unchanged since it isn't technically wrong.
- `provectuslabs/kafka-ui` has been transitioned to community maintenance (forked as `ghcr.io/kafbat/kafka-ui`); the `provectuslabs/kafka-ui:latest` image still pulls and works at the time of review. Worth flagging for a future revision but not a current technical error.
- The single-broker, `replication-factor=1` setup is correct for the dev/test scope the conclusion calls out; the post is honest about not being a multi-broker production design.
