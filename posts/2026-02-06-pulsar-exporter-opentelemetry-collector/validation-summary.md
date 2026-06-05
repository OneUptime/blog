# Validation Summary: How to Configure the Pulsar Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Pulsar exporter
- Apache Pulsar topics, partitioning, geo-replication, schema registry, and dead letter topics
- Pulsar Go client
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Pulsar exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/pulsarexporter/README.md
- OpenTelemetry Collector Contrib Pulsar exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/pulsarexporter/config.go
- OpenTelemetry Collector Contrib Pulsar exporter factory source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/pulsarexporter/factory.go
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Apache Pulsar messaging concepts: https://pulsar.apache.org/docs/3.0.x/concepts-messaging/
- Apache Pulsar geo-replication docs: https://pulsar.apache.org/docs/4.0.x/administration-geo/
- Apache Pulsar schema registry docs: https://pulsar.apache.org/docs/2.11.x/schema-overview/
- Apache Pulsar Go client docs: https://pulsar.apache.org/docs/2.8.x/client-libraries-go/
- Pulsar Go client API reference: https://pkg.go.dev/github.com/apache/pulsar-client-go/pulsar

## Issues Found
- The exporter examples used unsupported encoding values (`json`, `protobuf`). Changed them to supported values such as `otlp_json`, `otlp_proto`, and `jaeger_proto`.
- Several snippets used unsupported exporter fields including `producer_name`, nested `batching`, `properties`, `partitioning`, `message_key_attribute`, `message_routing_mode`, `schema`, `replication`, and `dead_letter_queue`. Replaced them with the actual `producer`, `auth`, `retry_on_failure`, and `sending_queue` settings where applicable.
- The TLS example used a non-existent Collector `tls` block and `authentication` shape. Updated it to `tls_trust_certs_file_path`, `tls_allow_insecure_connection`, and `auth.token.token`.
- The partitioning and message ordering sections claimed that the exporter can derive Pulsar message keys from OpenTelemetry attributes. Updated the text to explain that the exporter only keys Jaeger trace encodings by trace ID and otherwise relies on Pulsar producer/topic/partition semantics.
- The schema registry and geo-replication sections configured Pulsar-side features inside the Collector exporter. Updated them to clarify that those policies are managed in Pulsar, while the Collector exporter only points to a Pulsar topic.
- The dead letter queue section described a Collector exporter DLQ configuration that does not exist. Replaced it with supported retry and sending queue configuration and noted that DLQs are a Pulsar consumer-side feature.
- The internal monitoring example used the deprecated/ignored `service.telemetry.metrics.address` field and a separate Prometheus data exporter. Updated it to the current `service.telemetry.metrics.readers.pull.exporter.prometheus` form.
- The article over-stated ordering guarantees in a few places. Adjusted the wording to reflect Pulsar's ordering model and the exporter's limited keying support.

## Review Notes
- All YAML snippets parse successfully as YAML after the corrections.
- The local environment does not have `go` or `gofmt`, so the Go example could not be compiled locally. It was checked against the official Pulsar Go client API for `NewClient`, token authentication, `Subscribe`, shared subscriptions, `Receive`, `Ack`, and `Nack`.
- The Pulsar exporter is currently documented as alpha for traces, metrics, and logs in OpenTelemetry Collector Contrib.
