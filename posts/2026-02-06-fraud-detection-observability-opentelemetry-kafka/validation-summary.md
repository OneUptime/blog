# Validation Summary: How to Build a Fraud Detection Observability Pipeline Using OpenTelemetry Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry context propagation
- OpenTelemetry messaging semantic conventions for Kafka
- Apache Kafka and confluent-kafka Python client headers
- OpenTelemetry Collector Kafka receiver
- OpenTelemetry Collector tail sampling processor

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry semantic conventions for Kafka: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry Collector Kafka receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found
- The Python snippets used `json`, `trace`, and `metrics` without importing them in the relevant snippets. Added the missing imports so the examples use the OpenTelemetry Python APIs correctly.
- The decision service snippet created a counter from `meter`, which was not defined in that service snippet. Changed it to create a `decision_meter` with `metrics.get_meter(...)` and create the counter from that meter.
- The Kafka span attributes used older messaging semantic convention names, including `messaging.destination` and `messaging.operation`. Updated them to the current `messaging.destination.name` and `messaging.operation.name` names used by the OpenTelemetry Kafka messaging semantic conventions.
- The Kafka receiver Collector configuration used top-level `topic` and `encoding` fields. Updated the snippet to use the current signal-scoped trace configuration, `traces.topics` and `traces.encoding`.

## Review Notes
The code remains an instrumentation-focused tutorial and assumes application-specific objects and helpers such as `producer`, `fraud_model`, `extract_fraud_features`, `apply_fraud_rules`, `produce_scored_event`, and `produce_decision_event` already exist in the service code. The OpenTelemetry Collector `tail_sampling` processor is part of the contrib/k8s distributions, so deployments using a minimal Collector distribution must include that processor.
