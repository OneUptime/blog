# Validation Summary: How to Configure the Kafka Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kafka exporter
- OpenTelemetry Collector Kafka receiver
- Apache Kafka
- Kafka SASL and TLS authentication
- Kafka Connect
- Prometheus metrics

## Sources Consulted
- OpenTelemetry Collector Contrib Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Contrib Kafka exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/config.go
- OpenTelemetry Collector Contrib Kafka shared config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/kafka/configkafka/config.go
- OpenTelemetry Collector Contrib Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Apache Kafka topic configuration documentation: https://kafka.apache.org/41/configuration/topic-configs/

## Issues Found
- The Kafka exporter examples used top-level `topic` and `encoding` fields. Current exporter configuration uses signal-specific `traces`, `metrics`, and `logs` blocks for `topic` and `encoding`, so the snippets were updated accordingly.
- The dynamic topic routing example used unsupported template syntax and `fallback_topic`. Replaced it with the supported `topic_from_attribute` setting and signal-specific fallback topics.
- The partitioning examples used unsupported `partition_key` values and described trace ID partitioning as the default. Replaced them with supported fields such as `partition_traces_by_id`, `partition_metrics_by_resource_attributes`, `message_key_from_metadata_key`, and `record_partitioner`.
- TLS examples placed TLS configuration under `auth.tls`, which is deprecated. Moved TLS settings to the top-level `tls` block.
- The AWS MSK IAM mechanism was listed as `AWS_MSK_IAM`; the supported value is `AWS_MSK_IAM_OAUTHBEARER`. Updated the example and added explicit TLS.
- Producer retry fields `max_retries` and `retry_backoff` are not valid Kafka exporter producer settings. Replaced them with `retry_on_failure` settings.
- The post stated Snappy compression is the default. Current Kafka exporter defaults to no compression, so the compression list was corrected.
- The Kafka receiver example used deprecated singular `topic`. Updated it to signal-specific `traces.topics`.
- Kafka CLI examples omitted `--bootstrap-server` and used invalid shell line continuations with inline comments. Added `--bootstrap-server` and corrected the command formatting.
- The authentication test command used `--broker-list`; updated it to `--bootstrap-server`.
- The monitoring section referenced `otelcol_exporter_send_latency_bucket`, which is not in the documented Collector internal metrics list. Replaced it with the documented exporter queue size metric.

## Review Notes
The Kafka exporter is a beta component for traces, metrics, and logs, while profiles support is still development-level in the upstream documentation. Kafka Connect sink examples are plausible but depend on installing the named connector plugins and their vendor-specific configuration.
