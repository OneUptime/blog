# Validation Summary: How to Implement Kafka Connect SMT Custom

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka Connect
- Kafka Connect Single Message Transforms
- Java
- Maven
- Confluent Platform Kafka Connect Docker images
- JDBC Source Connector configuration

## Sources Consulted
- Apache Kafka 3.6.0 `Transformation` interface source: https://raw.githubusercontent.com/apache/kafka/3.6.0/connect/api/src/main/java/org/apache/kafka/connect/transforms/Transformation.java
- Apache Kafka 3.6.0 `ConnectRecord` source: https://raw.githubusercontent.com/apache/kafka/3.6.0/connect/api/src/main/java/org/apache/kafka/connect/connector/ConnectRecord.java
- Apache Kafka 3.6.0 `InsertField` SMT source: https://raw.githubusercontent.com/apache/kafka/3.6.0/connect/transforms/src/main/java/org/apache/kafka/connect/transforms/InsertField.java
- Confluent SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/overview.html
- Confluent custom SMT documentation: https://docs.confluent.io/platform/current/connect/transforms/custom.html
- Confluent JDBC Source Connector configuration reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Platform and Apache Kafka compatibility matrix: https://docs.confluent.io/platform/current/installation/versions-interoperability.html
- Confluent Platform 7.5 release notes: https://docs.confluent.io/platform/7.5/release-notes/index.html

## Issues Found
- The `Transformation` interface snippet included `configure(Map<String, ?> configs)` directly and omitted required imports for `Configurable` and `Closeable`. Updated the snippet to match the Kafka 3.6 API shape and clarified that `configure` comes from `Configurable`.
- The schemaless implementation cast the operating value directly to `Map`, which could produce a raw `ClassCastException`. Updated it to use Kafka Connect's `Requirements.requireMap` helper, matching built-in SMT patterns.
- The schema-aware implementation wrote a string mask value into any configured field, which can violate non-string field schemas. Updated the example to mask only string-typed schema fields and adjusted the surrounding wording.
- The Docker deployment example used `confluentinc/cp-kafka-connect:7.5.0` while the Maven example targets Kafka 3.6.0. Updated the Docker image to `7.6.0`, which aligns with Kafka 3.6.
- The logging snippet returned an undefined `transformedRecord` variable. Added a placeholder assignment so the snippet is internally consistent.
- The metrics snippet created a `Metrics` instance as a local variable and did not close it. Updated it to store the instance and close it in `close()`.

## Review Notes
Maven is not installed in this environment, so I could not run `mvn clean package` against the sample project locally. The review was completed against the Kafka 3.6 source and Confluent documentation listed above.
