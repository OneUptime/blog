# Validation Summary: How to Monitor Event Bus Backpressure and Dead Letter Queue Depth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics
- OTLP metrics export
- Redis-backed queues and dead letter queues
- Apache Kafka consumer lag
- Confluent Kafka Python client
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry semantic conventions for messaging metrics: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-metrics/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus client library compatibility guide: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Prometheus metric and label naming documentation: https://prometheus.io/docs/practices/naming/

## Issues Found
- The OpenTelemetry counter instruments were named with a Prometheus `_total` suffix. Updated the OpenTelemetry instrument names to omit `_total`; Prometheus exporters add the counter suffix during translation.
- Count metrics used `unit="messages"`, which is not the OpenTelemetry semantic convention style for message counts. Updated them to `unit="{message}"`.
- Observable gauges were first created with empty callback lists and then created again with the same names. Removed the empty observable registrations from the setup snippet and kept registration where callbacks are supplied.
- The observable callback examples referenced `metrics.Observation` without importing the documented `Observation` type directly. Added `from opentelemetry.metrics import Observation` and used `Observation(...)`.
- The consumer example used `json.dumps` and `self.redis_client` without importing `json` or storing a Redis client. Added the import and a `redis_client` constructor parameter.
- The Kafka lag example called an undefined `_get_consumer_offsets` helper. Replaced it with a `_get_consumer_lag` implementation using `AdminClient.list_consumer_group_offsets`, `AdminClient.list_offsets`, `ConsumerGroupTopicPartitions`, `TopicPartition`, and `OffsetSpec.latest()`.

## Review Notes
- The Python snippets were syntax-checked with `python3` after edits.
- The Prometheus alert names assume the default OpenTelemetry-to-Prometheus translation behavior that replaces dots with underscores and adds `_total` to monotonic counters.
