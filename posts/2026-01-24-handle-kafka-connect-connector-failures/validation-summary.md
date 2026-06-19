# Validation Summary: How to Handle Kafka Connect Connector Failures

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Kafka Connect REST API
- Kafka Connect error handling and dead letter queues
- Confluent JDBC, Elasticsearch, HTTP, and S3 sink/source connectors
- Confluent Schema Registry and AvroConverter
- Prometheus JMX Exporter
- Prometheus alerting rules
- Strimzi KafkaConnector custom resources
- Java, Bash, Python, JSON, YAML, and Mermaid

## Sources Consulted
- Apache Kafka Connect sink connector configuration reference: https://kafka.apache.org/32/generated/sink_connector_config.html
- Apache Kafka Connect user guide: https://kafka.apache.org/40/kafka-connect/user-guide/
- Apache Kafka Connect administration and connector state documentation: https://kafka.apache.org/42/kafka-connect/administration/
- Apache Kafka Connect `Transformation` Javadoc: https://kafka.apache.org/32/javadoc/org/apache/kafka/connect/transforms/Transformation.html
- Apache Kafka Connect `ConnectRecord` Javadoc: https://kafka.apache.org/43/javadoc/org/apache/kafka/connect/connector/ConnectRecord.html
- Apache Kafka Connect `SinkRecord` Javadoc: https://kafka.apache.org/34/javadoc/org/apache/kafka/connect/sink/SinkRecord.html
- Apache Kafka Connect `ConnectHeaders` Javadoc: https://kafka.apache.org/32/javadoc/org/apache/kafka/connect/header/ConnectHeaders.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Kafka Connect monitoring documentation: https://docs.confluent.io/platform/current/connect/monitoring.html
- Confluent HTTP Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/http/current/connector_config.html
- Confluent Elasticsearch Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Confluent JDBC Source Connector configuration reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Confluent S3 Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/s3-sink/current/configuration_options.html
- Confluent Schema Registry integration with Kafka Connect: https://docs.confluent.io/platform/current/schema-registry/connect.html
- Confluent Schema Registry client configuration reference: https://docs.confluent.io/platform/current/schema-registry/sr-client-configs.html
- Prometheus JMX Exporter rules documentation: https://prometheus.github.io/jmx_exporter/
- Strimzi KafkaConnector auto-restart documentation: https://strimzi.io/blog/2023/01/25/auto-restarting-connectors/
- Strimzi Operator configuration reference: https://strimzi.io/docs/operators/latest/configuring.html

## Issues Found
- Kafka Connect REST connector configurations used JSON booleans and numbers for several properties. Kafka Connect REST API documents connector configs as string-valued maps, so these values were changed to strings.
- The Elasticsearch Sink example used `type.name`, which is no longer present in the current Confluent Elasticsearch Sink connector configuration reference. It was removed.
- The DLQ processing example read `__connect.errors.exception.class.name`, but Kafka Connect DLQ context headers use `__connect.errors.class.name`. The header key was corrected, and the null check around `errorClass` was made safe.
- The custom SMT example cast raw config values directly, used `record.kafkaOffset()` on a generic `ConnectRecord`, and added Connect headers with byte-array APIs. It now uses `SimpleConfig`, logs `record.topic()`, and uses `headers.addString`.
- The SMT section implied delayed retry scheduling. It now states that SMTs can annotate or filter records but cannot schedule delayed retries by themselves, and the unused delay option was removed.
- The HTTP Sink reporter example omitted `reporter.bootstrap.servers`, which is required for the Connect Reporter configuration. It was added.
- The JMX exporter and alert examples treated Kafka Connect string `status` attributes as numeric metrics. The JMX rules now map connector and task statuses into labeled gauge metrics with value `1`, and the Prometheus expressions were updated accordingly.
- The Python restart script treated only HTTP `204` as success. Kafka Connect REST restart endpoints can return `200`, `202`, or `204` depending on the restart request, so the success checks were corrected.
- The Kubernetes operator example used a placeholder API group and unsupported `autoRestart`/`healthCheck` fields. It was changed to a Strimzi `KafkaConnector` resource with `apiVersion: kafka.strimzi.io/v1beta2`, the required cluster label, and supported `autoRestart` fields.
- The JDBC Source timeout example used the wrong case for `transaction.isolation.mode`. It was corrected to `READ_COMMITTED`.
- The Schema Registry/S3 example used `value.converter.schemas.enable`, which applies to JSON converters rather than AvroConverter, and used incorrect Schema Registry basic-auth converter property names. It now uses the documented Avro converter auth properties and the S3 connector's `schema.compatibility` property.
- The best-practice wording recommended `errors.tolerance=all` unconditionally. It now recommends configuring error tolerance intentionally and using `all` with a DLQ only when skipping bad records is acceptable.

## Review Notes
- Some connector snippets remain intentionally partial and environment-specific; they demonstrate the failure-handling settings rather than a complete production deployment.
- DLQ behavior applies to errors handled by Kafka Connect's error tolerance path. Connector-specific failures can still fail a task even when DLQ settings are present.
