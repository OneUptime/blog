# Validation Summary: How to Stream MySQL Changes to Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (binary logging, row-based replication)
- Apache Kafka (Confluent Platform 7.6.0)
- Apache ZooKeeper
- Kafka Connect
- Debezium MySQL Connector 2.6
- Docker Compose
- Single Message Transforms (SMTs)

## Sources Consulted
- Debezium MySQL Connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium Topic Routing documentation: https://debezium.io/documentation/reference/stable/transformations/topic-routing.html
- Debezium container images (GitHub): https://github.com/debezium/container-images
- Confluent Kafka Connect SMT documentation (RegexRouter): https://docs.confluent.io/platform/current/connect/transforms/regexrouter.html
- Confluent Docker Hub images: https://hub.docker.com/r/confluentinc/cp-kafka/ and https://hub.docker.com/r/confluentinc/cp-zookeeper
- Debezium Docker Hub images: https://hub.docker.com/r/debezium/connect

## Issues Found
1. **Incorrect SMT class for topic routing**: The "Configuring Topic-Per-Table Routing" section used `org.apache.kafka.connect.transforms.ReplaceField$Value` as the transform type. `ReplaceField$Value` is a field-renaming SMT that operates on the record's value payload — it cannot change the destination Kafka topic. Replaced with `org.apache.kafka.connect.transforms.RegexRouter`, which is the correct SMT for rerouting records to a different topic based on a regex pattern.
2. **Incorrect SMT properties for topic routing**: The original config used `transforms.route.topic`, which is not a valid property. Replaced with the correct `RegexRouter` properties: `transforms.route.regex` (pattern to match the original topic name) and `transforms.route.replacement` (the new topic name).

## Review Notes
- The Debezium connector configuration uses the correct Debezium 2.x property names (`topic.prefix` instead of the deprecated `database.server.name`, and `schema.history.internal.*` instead of the deprecated `database.history.*`).
- The Docker Compose setup uses Confluent Platform 7.6.0, which is the last major version to use ZooKeeper. Starting with Confluent Platform 8.0, ZooKeeper was removed in favor of KRaft mode. This is fine for a tutorial but worth noting for future updates.
- The Debezium event envelope example correctly shows the `before`, `after`, `op`, and `ts_ms` fields, though a real event also includes a `source` metadata object that is omitted here for brevity — this is acceptable for a tutorial.
- The `kafka-console-consumer` command uses `docker exec -it kafka`, which assumes the Kafka container is named `kafka`. With the Docker Compose file shown, the container name may be prefixed with the project directory name (e.g., `project-kafka-1`). This is a minor usability note, not a technical error.
