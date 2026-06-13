# Validation Summary: How to Set Up Kafka for Production

## Status
validated

## Post Type
Tutorial / Production setup guide

## Technologies Covered
- Apache Kafka
- Kafka KRaft mode
- Kafka TLS/SSL
- Kafka SASL/SCRAM
- Kafka ACLs
- Java Kafka producer and consumer clients
- systemd
- JMX
- Prometheus JMX Exporter
- Prometheus alerting
- MirrorMaker 2
- Linux kernel and disk tuning

## Sources Consulted
- Apache Kafka 4.3.0 Release Announcement: https://kafka.apache.org/blog/2026/05/22/apache-kafka-4.3.0-release-announcement/
- Apache Kafka 4.3 Quick Start: https://kafka.apache.org/43/getting-started/quickstart/
- Apache Kafka 4.3 Java Version: https://kafka.apache.org/43/operations/java-version/
- Apache Kafka 4.3 KRaft operations: https://kafka.apache.org/43/operations/kraft/
- Apache Kafka 4.3 broker configuration reference: https://kafka.apache.org/43/configuration/broker-configs/
- Apache Kafka 4.3 SSL documentation: https://kafka.apache.org/43/security/encryption-and-authentication-using-ssl/
- Apache Kafka 4.3 SASL documentation: https://kafka.apache.org/43/security/authentication-using-sasl/
- Apache Kafka 4.3 authorization and ACL documentation: https://kafka.apache.org/43/security/authorization-and-acls/
- Apache Kafka 4.3 monitoring documentation: https://kafka.apache.org/43/operations/monitoring/
- Apache Kafka 4.3 producer configuration reference: https://kafka.apache.org/43/configuration/producer-configs/
- Apache Kafka 4.3 consumer configuration reference: https://kafka.apache.org/43/configuration/consumer-configs/
- Apache Kafka 4.3 MirrorMaker configuration reference: https://kafka.apache.org/43/configuration/mirrormaker-configs/
- Prometheus JMX Exporter documentation: https://prometheus.github.io/jmx_exporter/

## Issues Found
- The post used Kafka 3.6.1 and linked to a `downloads.apache.org` URL that now returns 404. Updated the guide to Kafka 4.3.0, verified the current tarball URL, and changed extraction paths accordingly.
- Kafka 4.x brokers and tools require Java 17 or later. Updated the prerequisite from Java 11 to Java 17 for broker/controller nodes.
- Kafka 4.3 uses `config/server.properties` in the binary distribution. Updated the configuration, storage format, and systemd paths from `config/kraft/server.properties`.
- The KRaft configuration used the older static `controller.quorum.voters` style. Updated it to `controller.quorum.bootstrap.servers` and changed storage formatting to use `--initial-controllers` with controller directory IDs.
- The storage formatting example did not account for SCRAM credentials required before starting brokers that use SCRAM for broker/controller communication. Added `--add-scram` for the `admin` user during formatting.
- The metadata verification command used `kafka-metadata.sh`, which is not present in the Kafka 4.3.0 binary. Replaced it with `kafka-metadata-quorum.sh describe --status`.
- The TLS section required mutual TLS even though the guide did not generate client certificates and later used SASL for client authentication. Changed `ssl.client.auth` to `none` and adjusted the TLS sequence diagram.
- The SASL/SCRAM section created inter-broker credentials after startup, which is too late for SCRAM-secured broker/controller communication. Clarified that the `admin` credential is created during formatting, added an admin client properties file, and added `--command-config` to secured CLI commands.
- The SASL listener configuration left the controller listener as PLAINTEXT while enabling KRaft ACL authorization. Updated the controller listener mapping to `SASL_SSL`, added `sasl.mechanism.controller.protocol`, and added controller JAAS configuration.
- The ACL section omitted the KRaft `StandardAuthorizer` requirement and did not authenticate CLI calls after enabling SASL. Added the required authorizer/super-user settings and `--command-config` usage.
- The consumer ACL example combined topic and group permissions in one command. Split it into separate topic and group ACL commands.
- The JMX example disabled authentication and TLS for remote JMX in a production guide. Updated the systemd JMX options to require authentication and SSL.
- The Prometheus latency alert referenced a metric not produced by the sample JMX exporter rules. Added a matching 99th-percentile request latency exporter rule and updated the alert expression.
- The disk-full alert referenced Kafka metrics that were not defined by the exporter configuration. Replaced it with a node filesystem expression for the Kafka data mount.
- The Java producer comments incorrectly implied idempotence alone gives end-to-end exactly-once semantics. Updated the comment to distinguish idempotent retries from transactional exactly-once processing.
- The Java producer and consumer configured `SASL_SSL` but did not configure the truststore needed to trust the private CA. Added truststore properties to both client examples.

## Review Notes
- The post now targets Kafka 4.3.0, current as of this review date. Existing Kafka 3.x clusters need a planned upgrade path; Kafka 4.3 supports KRaft only.
- The guide still shows a compact combined broker/controller deployment. It now notes that critical production deployments should use dedicated controllers.
- The disk space alert assumes Prometheus also scrapes node exporter metrics for the Kafka data mount.
