# Validation Summary: How to Write Custom Kafka Connect Connectors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Kafka Connect source connectors
- Kafka Connect sink connectors
- Kafka Connect Single Message Transforms
- Java
- Maven
- HTTP client integration
- Kafka Connect REST API

## Sources Consulted
- Apache Kafka Connector Development Guide: https://kafka.apache.org/43/kafka-connect/connector-development-guide/
- Apache Kafka Connect SourceRecord Javadocs: https://www.javadoc.io/doc/org.apache.kafka/connect-api/3.6.2/org/apache/kafka/connect/source/SourceRecord.html
- Confluent Kafka Connect User Guide, plugin installation and plugin.path: https://docs.confluent.io/platform/current/connect/userguide.html
- Confluent Kafka Connect sink connector configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/sink-connect-configs.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Kafka Connect Transformation Javadocs: https://docs.confluent.io/platform/current/connect/javadocs/javadoc/org/apache/kafka/connect/transforms/Transformation.html
- Apache Kafka ErrantRecordReporter Javadocs: https://kafka.apache.org/26/javadoc/org/apache/kafka/connect/sink/ErrantRecordReporter.html

## Issues Found
- The Maven example omitted the required `modelVersion` element. Added `<modelVersion>4.0.0</modelVersion>` so the POM is valid.
- The code used Java's `HttpClient`, but the Maven snippet did not set a Java release. Added the Maven compiler plugin with `<release>11</release>`.
- The sink task used `Gson` without declaring a dependency. Added the `com.google.code.gson:gson` dependency.
- The sink task implied DLQ handling for failed HTTP records by throwing task exceptions. Kafka Connect sink tasks should use `ErrantRecordReporter` to report individual problematic records to the configured DLQ. Added an `ErrantRecordReporter` field and reporting path for non-retriable HTTP client errors.
- The `InterruptedException` catch path did not restore the interrupted status. Added `Thread.currentThread().interrupt()` before throwing a `RetriableException`.
- The DLQ description was too broad. Updated it to clarify that DLQs apply to records reported by sink connectors, converters, or transforms.

## Review Notes
The examples use Kafka Connect 3.6.0 dependencies. The APIs shown remain valid, but newer Kafka versions are available as of this review date, so production projects should align connector dependencies with the Kafka Connect runtime version they deploy against.
