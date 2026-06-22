# Validation Summary: How to Configure KRaft Mode Without ZooKeeper

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- Apache Kafka
- Kafka KRaft mode
- ZooKeeper to KRaft migration
- Kafka CLI tools
- Kafka broker and controller configuration
- Docker Compose
- Kubernetes StatefulSet
- Confluent Platform Kafka images
- systemd

## Sources Consulted
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/41/operations/kraft/
- Apache Kafka ZooKeeper to KRaft migration documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 4.0 upgrade notes and Java requirements: https://kafka.apache.org/40/getting-started/upgrade/
- Apache Kafka Java version documentation: https://kafka.apache.org/40/operations/java-version/
- Apache Kafka compatibility documentation: https://kafka.apache.org/41/getting-started/compatibility/
- Apache Kafka KIP-833, marking KRaft production ready: https://cwiki.apache.org/confluence/display/KAFKA/KIP-833%3A%2BMark%2BKRaft%2Bas%2BProduction%2BReady
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent KRaft configuration and monitoring documentation: https://docs.confluent.io/platform/current/kafka-metadata/config-kraft.html
- Confluent Platform supported versions and Kafka compatibility: https://docs.confluent.io/platform/current/installation/versions-interoperability.html

## Issues Found
- The prerequisites said "Java 11 or later" for all Kafka versions. This is inaccurate for Kafka 4.x brokers and tools, which require Java 17 or later. Updated the prerequisite to distinguish Kafka 3.x and Kafka 4.x requirements.
- The cluster architecture section said KRaft supports three deployment patterns but showed two. Changed this to "two common deployment patterns."
- The health verification commands used `kafka-metadata.sh` with unsupported `--snapshot` and `--command` usage. Replaced them with the official tools: `kafka-metadata-quorum.sh`, `kafka-metadata-shell.sh`, and `kafka-dump-log.sh`.
- The Docker Compose example advertised `EXTERNAL://localhost:<port>` listeners but mapped host ports to container port `9092` instead of the external listener port `9094`. Updated the port mappings to expose `9094` for each broker.
- The Confluent image examples used `confluentinc/cp-kafka:7.5.0`, which maps to an older Kafka baseline than the post's recommended Kafka 3.6+ guidance. Updated the examples to `confluentinc/cp-kafka:8.3.0`.
- The migration section referenced a `kafka-metadata-migration.sh` command flow that does not match Apache Kafka's documented migration process. Replaced it with the documented rolling migration approach using `zookeeper.metadata.migration.enable`, KRaft controllers, broker rolling restarts, log verification, and controller finalization.
- The troubleshooting command used `kafka-broker-api-versions.sh` against a controller listener. Replaced it with `kafka-metadata-quorum.sh --bootstrap-controller`, which is the correct tool for controller quorum status.
- The migration diagram used "Kafka 3.5+" as the upgrade target. Updated it to a supported 3.x bridge release and noted that Kafka 3.9 is the last Apache Kafka bridge release.

## Review Notes
- The post remains a valid KRaft configuration guide after the fixes.
- The examples use PLAINTEXT listeners for simplicity. Production deployments should configure TLS/SASL as appropriate.
- `controller.quorum.voters` is still usable for static quorums, but current Kafka documentation also describes newer dynamic quorum configuration with `controller.quorum.bootstrap.servers`.
