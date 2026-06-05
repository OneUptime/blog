# Validation Summary: How to Use Kafka as a Durable Buffer Between OpenTelemetry Collector Tiers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kafka receiver and exporter
- Apache Kafka topics and consumer groups
- Grafana Tempo
- Grafana Loki
- Prometheus remote write
- Prometheus alerting rules
- Kubernetes kubectl

## Sources Consulted
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- Apache Kafka topic configuration documentation: https://kafka.apache.org/43/configuration/topic-configs/
- Apache Kafka basic operations / consumer group offset reset documentation: https://kafka.apache.org/42/operations/basic-kafka-operations/
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Grafana Tempo OpenTelemetry Collector documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/
- OpenTelemetry Collector prometheusremotewrite exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md

## Issues Found
- The post described the architecture as guaranteeing "zero telemetry data loss." Kafka materially improves durability, but loss is still possible if retention is exceeded, Kafka storage fails beyond replication guarantees, producers cannot reach Kafka, offsets are mishandled, or backend replay cannot keep up. I changed the wording to describe reduced loss risk and stronger durability rather than an absolute guarantee.
- The Kafka exporter examples used top-level `topic` and `encoding` settings. Current OpenTelemetry Collector Kafka exporter documentation uses signal-specific settings such as `traces.topic`, `logs.topic`, and `metrics.topic`. I updated the edge Collector exporter snippets accordingly.
- The Kafka receiver examples used top-level `topic` and `encoding` settings. Current receiver documentation uses signal-specific `topics` and `encoding` settings, with the singular `topic` field deprecated inside each signal. I updated the gateway Collector receiver snippets to use `traces.topics`, `logs.topics`, and `metrics.topics`.
- The gateway Kafka receiver used `auto_commit`, but the documented field name is `autocommit`. I changed the field name and added `message_marking.after: true` so offsets are marked after pipeline execution instead of before downstream processing completes.
- The Loki exporter example used the OTLP gRPC exporter pointed at port 3100. Grafana Loki's native OTLP log ingestion endpoint is HTTP and the documentation says to use the `otlphttp` exporter with an endpoint like `http://<loki-addr>/otlp`. I changed the exporter to `otlphttp/loki` and updated the logs pipeline reference.
- The Tempo OTLP gRPC example pointed to a plaintext Kubernetes service without setting TLS behavior. Grafana Tempo's example sets `tls.insecure: true` for non-TLS OTLP gRPC endpoints, so I added that setting to make the example work in the shown internal-service context.

## Review Notes
- The Kafka CLI topic creation options and consumer group reset command flags are consistent with Apache Kafka documentation. The offset reset command correctly requires inactive consumers and uses the documented `--to-datetime` format.
- The Prometheus remote write exporter configuration is syntactically plausible for a backend that accepts Prometheus remote write. A stock Prometheus server must have its remote write receiver enabled separately for this endpoint to ingest data.
- The lag alert metric name depends on the Kafka exporter used for Prometheus metrics and may need label-name adjustments in a real environment.
