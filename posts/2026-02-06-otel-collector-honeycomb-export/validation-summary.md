# Validation Summary: How to Configure the OpenTelemetry Collector to Export Data to Honeycomb with

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Honeycomb OTLP ingest
- OpenTelemetry Collector processors
- OpenTelemetry Collector routing connector
- Docker Compose
- Kubernetes

## Sources Consulted
- Honeycomb OpenTelemetry Collector documentation: https://docs.honeycomb.io/send-data/opentelemetry/collector/
- Honeycomb logs with OpenTelemetry Collector documentation: https://docs.honeycomb.io/send-data/logs/collector/
- OpenTelemetry Collector routing processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib Docker image validation using `otel/opentelemetry-collector-contrib:latest`

## Issues Found
- The post described per-signal Honeycomb dataset routing too broadly. Current Honeycomb documentation says metrics require a dataset, logs can use a dataset but OTLP logs with `service.name` use that instead, and trace datasets are required for Honeycomb Classic rather than the current default Honeycomb environment model. Updated the description and introductory explanation, removed the trace dataset header from the main OTLP exporter, and added a comment to the logs exporter.
- The multi-team routing example used the deprecated `routing` processor. Replaced it with the current `routing` connector pattern, which routes to pipelines rather than directly to exporters.
- The transform example named a field `duration_ms` but stored a nanosecond difference. Updated the OTTL statement to use current span path prefixes and divide by 1,000,000.

## Review Notes
The Collector snippets for the basic Honeycomb exporters, routing connector, transform processor, and tail sampling processor were validated with the current `otel/opentelemetry-collector-contrib:latest` image. The Kubernetes example assumes the referenced `otel-collector-config` ConfigMap is created separately from the shown Deployment and Secret.
