# Validation Summary: How to Use Kafka as a Buffer Between Collector Tiers for Maximum Durability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kafka exporter
- OpenTelemetry Collector Kafka receiver
- Apache Kafka
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler
- Prometheus metrics and PromQL

## Sources Consulted
- OpenTelemetry Collector contrib Kafka exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector contrib Kafka receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector exporter helper documentation for retry and sending queue behavior: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry Collector TLS/exporter configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Apache Kafka topic configuration documentation: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka producer configuration documentation: https://kafka.apache.org/37/configuration/producer-configs/
- Apache Kafka consumer group documentation: https://kafka.apache.org/documentation/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/

## Issues Found
- The Kafka exporter examples used deprecated top-level `topic` and `encoding` fields. Updated them to the current per-signal `traces`, `metrics`, and `logs` configuration blocks because top-level Kafka exporter topic and encoding fields were deprecated and removed in newer Collector contrib releases.
- The Kafka receiver examples used deprecated top-level `topic`/`encoding` fields and the wrong `auto_commit` key. Updated receiver snippets to use per-signal `topics`/`encoding` blocks and the documented `autocommit` key.
- The gateway receiver configuration described committing offsets after successful backend export but did not configure post-pipeline message marking. Added `message_marking.after: true` and `message_marking.on_error: false` so offsets are marked only after downstream pipeline success.
- The backend retry configuration used finite retry windows, which conflicted with the outage-recovery behavior described in the post. Set `max_elapsed_time: 0` on OTLP exporters so retry attempts do not stop before Kafka retention is exhausted.
- The Kubernetes deployment pinned an outdated Collector contrib image tag. Updated it from `0.96.0` to `0.153.0`, matching the current Collector contrib release line available at review time.

## Review Notes
- The Kafka topic commands and retention explanation are technically correct; Kafka `retention.bytes` is enforced per partition.
- The HPA example is structurally valid for `autoscaling/v2`, but it still depends on an installed external metrics adapter that exposes `kafka_consumer_group_lag` to Kubernetes.
- YAML snippets were parsed locally after the fixes.
