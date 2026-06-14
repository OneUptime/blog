# Validation Summary: How to Get Started with Apache Flink

## Status
validated

## Post Type
Tutorial / getting started guide

## Technologies Covered
- Apache Flink 1.18.1
- Flink DataStream API
- Flink checkpointing and state backends
- Apache Kafka and Flink Kafka connector 3.2.0-1.18
- Maven
- Docker Compose
- Java 11

## Sources Consulted
- Apache Flink 1.18 DataStream API Programming Guide: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/dev/datastream/overview/
- Apache Flink 1.18 Kafka Connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/kafka/
- Apache Flink 1.18 Checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/dev/datastream/fault-tolerance/checkpointing/
- Apache Flink 1.18 State Backends documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/state/state_backends/
- Apache Flink 1.18 Standalone Docker documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/resource-providers/standalone/docker/
- Apache Flink 1.18 Java compatibility documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/java_compatibility/
- Apache Flink 1.18.1 release announcement: https://flink.apache.org/2024/01/19/apache-flink-1.18.1-release-announcement/

## Issues Found
- The Docker Compose Flink services used image tags and environment variables that did not match the official Flink 1.18.1 Docker Compose examples. Changed the image tag to `flink:1.18.1-scala_2.12` and configured `jobmanager.rpc.address` through `FLINK_PROPERTIES`, matching the Flink 1.18 Docker documentation.
- The Docker Compose snippet used `deploy.replicas` with a plain `docker-compose up -d` workflow. That setting is not the normal Compose scaling mechanism shown in the Flink docs. Changed it to `scale: 2` in the example service definition.
- The Kafka container advertised only `localhost:9092`, which works for host clients but not for Flink containers, where `localhost` refers to the container itself. Added separate internal and host listeners so Flink containers can use `kafka:29092` while host-based examples can still use `localhost:9092`, and added comments in the Kafka source and sink snippets clarifying which bootstrap address to use.

## Review Notes
- The Java snippets align with the Flink 1.18.1 DataStream, KafkaSource, KafkaSink, checkpointing, and RocksDB state backend documentation reviewed.
- Flink 1.18.1 is an older release as of this validation date, but the post consistently targets that version and remains technically useful for that version.
- Maven is not installed in this review environment, so I could not run a local `mvn package` compile check.
