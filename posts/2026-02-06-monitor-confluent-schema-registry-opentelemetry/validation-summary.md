# Validation Summary: How to Monitor Confluent Schema Registry with OpenTelemetry

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Confluent Schema Registry
- Kafka
- Java JMX
- Prometheus JMX Exporter
- OpenTelemetry Collector
- OpenTelemetry Python API
- Confluent Kafka Python Schema Registry client

## Sources Consulted
- Confluent Schema Registry monitoring documentation: https://docs.confluent.io/platform/7.4/schema-registry/monitoring.html
- Confluent Kafka Python SchemaRegistryClient documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka Python SchemaRegistryClient source documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/_modules/confluent_kafka/schema_registry/_sync/schema_registry_client.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Prometheus JMX Exporter rules documentation: https://prometheus.github.io/jmx_exporter/1.1.0/http-mode/rules/

## Issues Found
- The JMX exporter rules referenced Schema Registry MBeans such as `kafka-store`, `json-schema-provider`, `avro-schema-provider`, and `protobuf-schema-provider` that are not listed in Confluent's official Schema Registry monitoring documentation. I replaced them with documented `jetty-metrics`, `jersey-metrics`, and `master-slave-role` rules.
- The Jersey metric rule used `name=(.+)` as an object-name property and `\w+` for metric attributes. Confluent documents `jersey-metrics` as a type-level MBean whose attributes include dots and hyphens, such as `request-error-rate`. I updated the pattern so it matches those documented attributes.
- The alert examples referenced `schema_registry_master_slave_master_slave_role` and a Kafka store flush latency metric. I updated the examples to match the corrected JMX exporter output and documented Schema Registry metrics.
- The Python tracing example called `span.set_status(trace.StatusCode.ERROR, str(e))`. Current OpenTelemetry Python examples and API docs use a `Status` object, so I imported `Status` and `StatusCode` from `opentelemetry.trace` and changed the calls to `span.set_status(Status(StatusCode.ERROR, str(e)))`.

## Review Notes
- The Confluent Python `SchemaRegistryClient` methods used in the post (`get_schema`, `register_schema`, and `test_compatibility`) are valid current APIs.
- The OpenTelemetry Collector configuration shape for the Prometheus receiver, OTLP receiver/exporter, resource processor, batch processor, and service pipelines is consistent with current Collector component documentation.
- The Prometheus JMX Exporter sanitizes metric names, so generated names containing captured dots or hyphens are normalized into Prometheus-compatible names.
