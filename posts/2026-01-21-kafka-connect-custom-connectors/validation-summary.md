# Validation Summary: How to Build Custom Kafka Connectors

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka Connect
- Kafka Connect SourceConnector, SourceTask, SinkConnector, and SinkTask APIs
- Java
- Maven
- OkHttp
- Jackson Databind
- JUnit 5
- Testcontainers
- Confluent Kafka Connect component packaging

## Sources Consulted
- Apache Kafka Connector Development Guide: https://kafka.apache.org/39/kafka-connect/connector-development-guide/
- Apache Kafka 3.7 SourceRecord Javadoc: https://kafka.apache.org/37/javadoc/org/apache/kafka/connect/source/SourceRecord.html
- Apache Kafka SinkTaskContext Javadoc for errantRecordReporter behavior: https://kafka.apache.org/26/javadoc/org/apache/kafka/connect/sink/SinkTaskContext.html
- Apache Kafka 3.7 Kafka Connect User Guide for plugin.path: https://kafka.apache.org/37/kafka-connect/user-guide/
- OkHttp official documentation and examples: https://square.github.io/okhttp/
- Confluent Component Archive Specification: https://docs.confluent.io/platform/current/connect/confluent-hub/component-archive.html
- Testcontainers Kafka module documentation: https://java.testcontainers.org/modules/kafka/
- Testcontainers JUnit 5 documentation: https://java.testcontainers.org/test_framework_integration/junit_5/
- Apache Maven POM documentation: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html
- Maven Central metadata for Jackson Databind 2.17.2: https://central.sonatype.com/artifact/com.fasterxml.jackson.core/jackson-databind/2.17.2

## Issues Found
- The Maven example omitted `modelVersion`, which is required in standard Maven POMs. Added `<modelVersion>4.0.0</modelVersion>`.
- The code used Jackson `ObjectMapper` but did not include `jackson-databind`. Added the Maven dependency.
- The integration test referenced Testcontainers APIs without dependencies/imports, and the older Kafka container class is deprecated in current Testcontainers docs. Added current Testcontainers 2.0.5 dependencies and updated the example to `ConfluentKafkaContainer`.
- The source connector defined `batch.size` but did not enforce it. Updated polling to cap returned records per poll.
- The HTTP source request built query strings by string concatenation. Replaced it with OkHttp `HttpUrl` query parameter construction.
- The source task read `response.body()` without checking for a null response body. Added a null check before parsing.
- The source configuration accepted zero or negative poll intervals and batch sizes. Added `ConfigDef.Range.atLeast(1)` validators.
- The sink connector referenced `HttpSinkConnectorConfig` but did not define it. Added the missing configuration class.
- The sink task built JSON arrays by appending `value().toString()`, which can produce invalid JSON for non-string values. Updated it to serialize non-string values with Jackson.
- The retriable-error example used undefined placeholder exception classes. Replaced them with concrete Java exception types.
- The DLQ example assumed `context.errantRecordReporter()` is always non-null. Added a null check and a `ConnectException` fallback.
- The unit test omitted imports for Java collections and `ConfigDef`. Added the missing imports.
- The Confluent manifest example was missing required fields such as `component_types`, `owner.username`, and `owner.type`. Added the required metadata and corrected feature metadata.
- The component archive layout and build script did not match Confluent's documented archive naming and root-directory convention. Updated the archive root and ZIP filename.
- The deployment unzip command referenced the old ZIP filename after the archive naming correction. Updated the command.

## Review Notes
The examples are still tutorial-level and omit full runnable connector test harness code, but the API usage, dependencies, packaging metadata, and configuration examples now align with the referenced official documentation.
