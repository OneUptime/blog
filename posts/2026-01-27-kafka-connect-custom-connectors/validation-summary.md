# Validation Summary: How to Build Kafka Connect Custom Connectors

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Java
- Maven
- Kafka Connect SourceConnector and SinkConnector APIs
- Kafka Connect schemas and Single Message Transforms
- Kafka Connect REST API
- Strimzi KafkaConnect and KafkaConnector custom resources
- Prometheus JMX Exporter

## Sources Consulted
- Apache Kafka Connector Development Guide: https://kafka.apache.org/43/kafka-connect/connector-development-guide/
- Apache Kafka Connect configuration reference: https://kafka.apache.org/43/configuration/kafka-connect-configs/
- Apache Kafka generated Connect metrics reference: https://kafka.apache.org/31/generated/connect_metrics.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Kafka Connect Filter SMT reference: https://docs.confluent.io/kafka-connectors/transforms/current/filter-ak.html
- Strimzi Operator configuration reference: https://strimzi.io/docs/operators/latest/configuring.html

## Issues Found
- Source connector task configuration duplicated ingestion when `tasks.max` was greater than one. Changed the simple REST API connector to return a single task unless API partitioning is implemented, and updated example `tasks.max` / `tasksMax` values to `1`.
- Delivery semantics were overstated as exactly-once. Changed offset-tracking language to describe resumable processing and duplicate-safe/idempotent behavior instead of implying exactly-once delivery.
- The SourceRecord comment incorrectly implied `null` partition meant round-robin even though the example uses a non-null key. Updated the comment to say the producer partitioner uses the key when partition is null.
- The source task comment said the framework handles backoff automatically. Updated it to state that this task controls pacing with its configured sleep interval.
- The SMT example described `InsertField.timestamp.field` as the current timestamp. Updated it to say record timestamp.
- The SMT example said `RegexRouter` routes based on a field. Updated it to route based on topic name, which is what `RegexRouter` does.
- The filter SMT example described dropping nulls broadly. Updated it to specify tombstone records, which are records with null values.
- The custom SMT did not handle tombstone/null values and used the platform default charset for hashing. Added a null-value pass-through and UTF-8 encoding.
- The custom SMT could hash non-string schema fields and then write a string into the original non-string schema. Added a schema type check that fails clearly for non-string fields.
- The project setup omitted ServiceLoader manifest files needed for reliable Kafka Connect plugin discovery. Added commands to create source and sink connector service descriptors.
- The Strimzi examples used the older `kafka.strimzi.io/v1beta2` API version. Updated them to `kafka.strimzi.io/v1`.

## Review Notes
Kafka version `3.6.0` is older than the current Apache Kafka documentation reviewed, but the APIs used by the examples remain consistent with Kafka Connect connector development patterns. The examples are still simplified tutorial code; a production connector should add stronger validation, test coverage, proper secret provider configuration, and more robust retry/error handling.
