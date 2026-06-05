# Validation Summary: How to Build a Queue Depth and Consumer Lag Dashboard from OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python metrics and tracing APIs
- OpenTelemetry Collector Kafka Metrics receiver
- OpenTelemetry Collector RabbitMQ receiver
- OpenTelemetry Collector Prometheus Remote Write exporter
- Apache Kafka consumer group lag metrics
- RabbitMQ management metrics
- Prometheus and PromQL

## Sources Consulted
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry messaging client metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-metrics/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Kafka Metrics receiver README and metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/kafkametricsreceiver
- OpenTelemetry Collector RabbitMQ receiver README and metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/rabbitmqreceiver
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post claimed OpenTelemetry messaging semantic conventions standardize queue depth and lag metric names across brokers. Current OpenTelemetry messaging semantic conventions standardize client span and metric names, while broker backlog metrics are receiver-specific. Updated the explanation to distinguish client conventions from broker receiver metrics.
- The Python example used non-current/custom metric names such as `messaging.publish.messages`, `messaging.receive.messages`, and `messaging.publish.duration`. Updated the example to use current messaging client metrics such as `messaging.client.sent.messages`, `messaging.client.consumed.messages`, `messaging.client.operation.duration`, and `messaging.process.duration`.
- The Python example included an undefined `get_consumer_lag()` callback and an ObservableGauge that would not work as shown. Removed that application-side lag gauge and added a concrete instrumented consume function, leaving broker lag collection to the Collector receiver.
- The Python example recorded duration in milliseconds while current messaging duration conventions use seconds. Updated timing to use `time.perf_counter()` and record seconds.
- The Collector example used deprecated component identifiers for Kafka Metrics and Prometheus Remote Write. Updated the example to `kafka_metrics` and `prometheus_remote_write`, and fixed the pipeline reference.
- The Prometheus Remote Write exporter example targeted an HTTP Prometheus endpoint without disabling TLS verification and without noting that a vanilla Prometheus server must enable its remote write receiver. Added `tls.insecure: true`, `resource_to_telemetry_conversion.enabled: true`, and the `--web.enable-remote-write-receiver` caveat.
- The RabbitMQ password used older environment variable interpolation syntax. Updated it to `${env:RABBITMQ_PASSWORD}`.
- The Kafka queue depth PromQL query referenced non-existent metric names. Replaced it with `kafka_consumer_group_lag`, which is emitted by the Kafka Metrics receiver, and added a RabbitMQ queue depth query using `rabbitmq_message_current{state="ready"}`.
- The application metric PromQL queries referenced the old metric names. Updated them to query the corrected metric names.
- The alert used subquery syntax that should be parenthesized around the aggregate expression. Updated the expression to `deriv((sum by (topic) (kafka_consumer_group_lag))[15m:1m])`.
- The dashboard layout mentioned oldest unprocessed message age as if it came from the shown metrics. Narrowed the claim to say that panel should be used only if the broker or application instrumentation exports that metric.

## Review Notes
The Kafka and RabbitMQ receiver metrics are still marked development or beta in the Collector metadata, so exact metric availability can vary by Collector version and distribution. The dashboard queries assume the Prometheus Remote Write exporter's default Prometheus name translation with metric suffixes enabled.
