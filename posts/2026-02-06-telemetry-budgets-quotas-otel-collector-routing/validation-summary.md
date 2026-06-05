# Validation Summary: How to Use Telemetry Budgets and Quotas per Team

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry spanmetrics connector
- Prometheus Remote Write
- PromQL alerting rules
- Python requests
- YAML

## Sources Consulted
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/

## Issues Found
- The post described and configured the current routing behavior as a routing processor using `from_attribute` and `value`. Current OpenTelemetry Collector documentation uses the routing connector with OTTL `condition` entries and connector exporter/receiver wiring. Updated the wording, diagram label, and Collector configuration to use `routing/*` connectors.
- The routing table sent each route to traces, logs, and metrics pipelines at once, while the example only defined trace pipelines. Updated the example to define signal-specific routing connectors and matching traces, logs, and metrics pipelines.
- The spanmetrics example defined the connector and exporter but did not wire the connector into service pipelines. Added the trace exporter and metrics receiver pipeline needed for spanmetrics to generate and export usage metrics.
- The PromQL examples queried `spans_total`, which is not the current spanmetrics connector's generated Prometheus metric name. Updated the Python query and alert rules to use `traces_span_metrics_calls_total`.
- The Prometheus Remote Write exporter used the deprecated `prometheusremotewrite` component alias. Updated it to the current `prometheus_remote_write` component type.

## Review Notes
The corrected configuration demonstrates sampling-based budget enforcement for traces. Logs and metrics are routed by team, but exact per-team hard quotas still require additional processors, backend controls, or generated configuration beyond the snippets shown.
