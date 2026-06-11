# Validation Summary: How to Create Kafka Connect Source Connector Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Connect
- Kafka Connect SourceConnector and SourceTask APIs
- Kafka Connect REST API and plugin discovery
- Maven and maven-shade-plugin
- Java 11 HTTP client
- Jackson JSON processing
- JUnit 4, Mockito, and Testcontainers
- Kafka command-line tools

## Sources Consulted
- Apache Kafka 3.6 SourceConnector Javadoc: https://kafka.apache.org/36/javadoc/org/apache/kafka/connect/source/SourceConnector.html
- Apache Kafka 3.6 SourceTask Javadoc: https://kafka.apache.org/36/javadoc/org/apache/kafka/connect/source/SourceTask.html
- Apache Kafka 3.6 Kafka Connect User Guide: https://kafka.apache.org/36/kafka-connect/user-guide/
- Apache Kafka 3.6 Kafka Connect Administration Guide: https://kafka.apache.org/36/kafka-connect/administration/
- Confluent Kafka Connector Developer Guide: https://docs.confluent.io/platform/current/connect/devguide.html
- Testcontainers Kafka Module documentation: https://java.testcontainers.org/modules/kafka/
- Testcontainers JUnit 4 integration documentation: https://java.testcontainers.org/test_framework_integration/junit_4/

## Issues Found
- The Maven dependencies included Apache HttpClient 5, but the sample task uses Java 11's `java.net.http.HttpClient`. Removed the unused HttpClient dependency to keep the dependency list accurate.
- The integration test used Testcontainers Kafka classes but the POM did not include the Testcontainers Kafka module. Added the official `org.testcontainers:testcontainers-kafka` test dependency.
- The Testcontainers example used deprecated `org.testcontainers.containers.KafkaContainer` with a Confluent image. Updated it to `org.testcontainers.kafka.ConfluentKafkaContainer`, which is the documented class for `confluentinc/cp-kafka` images.
- Removed an unused `org.apache.kafka.connect.json.JsonDeserializer` import from the integration test snippet.
- The SourceRecord comment claimed the sample provided exactly-once semantics. Reworded it to say the source partition and offset let Kafka Connect resume after restarts, which matches the sample's behavior.
- The offset-management introduction overstated that proper offsets ensure no loss or duplicates. Reworded it to say they help avoid data loss and unnecessary duplicates.
- The connector discovery file was described as a manifest. Updated the section to call it a ServiceLoader provider file, matching Kafka Connect plugin discovery documentation.
- The troubleshooting table incorrectly tied `UNASSIGNED` to missing plugins. Split that into a missing connector class/plugin-path row and an `UNASSIGNED` row for worker assignment/rebalance issues.
- The debugging command described checking consumer group lag for the Connect offsets topic with a connector-specific group name. Reworded it as checking the distributed Connect worker group and used a placeholder worker `group.id`.

## Review Notes
The article is technically relevant and remains accurate as a tutorial after the corrections. The sample connector is illustrative rather than a complete production implementation; future improvements could include more complete HTTP response testing, stronger URL construction, and explicit handling for interruption during retry backoff.
