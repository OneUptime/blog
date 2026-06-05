# Validation Summary: How to Configure Tenant Isolation with Separate Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- Routing connector
- Batch processor
- Attributes processor
- Probabilistic sampler processor
- Collector internal telemetry
- Python YAML generation

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector HTTP configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector TLS configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The routing connector example used `statement` with request metadata. Current routing connector docs require `condition` for `context: request`, because `statement` may not be used with request context. Updated each route to include `context: request` and `condition: request["X-Tenant-ID"] == "..."`
- The routing connector example used `match_once: true`, which was deprecated in Collector v0.116.0 and removed in v0.120.0. Removed the setting and relied on the current default `move` action behavior.
- The routing connector example routed traces, metrics, and logs through one connector instance with mixed-signal destination lists. The routing connector supports same-signal routing, so the example now uses `routing/traces`, `routing/metrics`, and `routing/logs` with signal-specific default and tenant pipelines.
- The internal telemetry snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- The post described queue sizes as per-pipeline metrics. The documented metrics are exporter queue metrics, so the wording now says per-exporter queue sizes.
- The custom Prometheus reader example now sets `without_type_suffix: true` and `without_units: true` so the metric names referenced in the text match the names exposed by the configured reader.

## Review Notes
The post is technically valid after the corrections. The routing connector remains alpha for traces, metrics, and logs, so future Collector releases may require additional updates.
