# Validation Summary: How to Implement Multi-Tenant Observability Pipelines with Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector resource processor
- OpenTelemetry Transformation Language (OTTL)
- OTLP receiver and exporter
- Tail sampling processor
- Batch processor
- OpAMP
- Collector internal telemetry and Prometheus scraping

## Sources Consulted
- OpenTelemetry Collector routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The post presented the deprecated `routingprocessor` as the primary implementation path. Updated the post to use the current `routing` connector and added a note that the old processor is deprecated in favor of the connector.
- The gateway routing example used processor fields such as `from_attribute`, `attribute_source`, `default_exporters`, and `table.value`. Updated it to the current routing connector schema using `connectors`, `default_pipelines`, `context`, `condition`, and destination pipelines.
- The OTTL routing example used processor-style `statement` entries with bare boolean expressions and claimed the first match wins. Updated it to connector-style `condition` entries and clarified that the default `move` action removes matched data from later route evaluation.
- The per-tenant processing example used the old connector-style attribute fields and described memory limits that were not configured. Updated the example to current OTTL connector conditions and changed the surrounding wording to batching and sampling.
- The header-based routing example used `attribute_source: context` on the routing processor. Updated it to routing connector `request` context conditions.
- The monitoring section listed stale or unsupported metric names and used the now-ignored `service.telemetry.metrics.address` setting. Updated the metric list to current Collector internal telemetry names and replaced the config with the Prometheus pull reader configuration.

## Review Notes
The snippets now target the current OpenTelemetry Collector routing connector model. The main gateway example shows traces and explicitly says to repeat the same connector pattern for metrics and logs by changing the pipeline type, because routing connectors connect pipelines of the same signal type.
