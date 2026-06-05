# Validation Summary: How to Configure the OpenTelemetry Collector to Export to Axiom with Per-Signal

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib distribution
- OTLP/HTTP exporter and receiver
- Axiom OTLP ingestion
- Collector routing connector
- Collector batch, resource, probabilistic sampler, and filter processors
- Docker Compose
- curl

## Sources Consulted
- Axiom OpenTelemetry documentation: https://axiom.co/docs/send-data/opentelemetry
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector contrib routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md

## Issues Found
- The post used the deprecated `otlphttp` exporter component name. Updated examples to use the current `otlp_http` component name.
- The metrics exporter used `X-Axiom-Dataset`. Axiom documents `x-axiom-metrics-dataset` for metrics, so the metrics example now uses `X-Axiom-Metrics-Dataset`.
- The post used the deprecated routing processor for service and environment routing. Updated those examples to use the routing connector, including routing tables that target pipelines.
- The filter processor example used the older `logs.log_record` configuration shape. Updated it to the current `log_conditions` form with `log.severity_number < SEVERITY_NUMBER_INFO`.
- The environment routing example needed service pipelines to demonstrate how the routing connector is wired. Added the minimal matching pipeline block.

## Review Notes
Validated representative corrected Collector configurations with `otel/opentelemetry-collector-contrib:latest`, which resolved to Collector contrib `0.153.0`. The Docker Compose `version` key may produce a warning in newer Docker Compose implementations, but it remains parseable and was not changed because it does not affect the Collector configuration itself.
