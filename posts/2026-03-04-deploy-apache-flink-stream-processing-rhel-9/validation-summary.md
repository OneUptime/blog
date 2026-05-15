# Validation Summary: How to Deploy Apache Flink for Stream Processing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Flink 1.18.1
- Java 11 / OpenJDK
- systemd
- firewalld
- Apache Kafka connector for Flink
- RocksDB state backend
- Flink CLI and REST API

## Sources Consulted
- Apache Flink 1.18 Java Compatibility: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/java_compatibility/
- Apache Flink 1.18 Configuration: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/config/
- Apache Flink 1.18 Standalone Deployment Overview: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/resource-providers/standalone/overview/
- Apache Flink 1.18 Command-Line Interface: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/deployment/cli/
- Apache Flink 1.18 Kafka Connector: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/kafka/
- Apache Flink 1.18 State Backends: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/state/state_backends/
- Red Hat build of OpenJDK 11 on RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/11/html/installing_and_using_red_hat_build_of_openjdk_11_on_rhel/

## Issues Found
- The Flink REST configuration used `rest.address: 0.0.0.0`. Flink documents `rest.address` as the client-facing address and `rest.bind-address` as the bind address, so I changed `rest.address` to `localhost` while leaving `rest.bind-address: 0.0.0.0`.
- The state backend example used `state.backend: rocksdb`. Flink 1.18 documents `state.backend.type` as the current default state backend key, so I updated the snippet to `state.backend.type: rocksdb`.
- The Kafka sink example did not set a delivery guarantee. Flink's KafkaSink defaults to `DeliveryGuarantee.NONE`, which conflicted with the article's exactly-once framing. I added `DeliveryGuarantee.EXACTLY_ONCE` and a stable `transactionalIdPrefix`.

## Review Notes
Flink 1.18.1 is an older Flink release as of this review date, but the post is internally consistent for that version. The Kafka example still assumes the application includes the appropriate `flink-connector-kafka` dependency and that Kafka consumers use committed reads when relying on exactly-once output semantics.
