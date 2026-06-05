# Validation Summary: How to Route Logs to Different Backends Based on Severity Level

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib routing connector
- OpenTelemetry Collector filter processor
- OpenTelemetry logs severity numbers
- OpenTelemetry Collector internal telemetry metrics
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry logs data model specification: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- OpenTelemetry Collector exporter helper retry documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper

## Issues Found
- The routing connector examples used `statement: route()` together with `condition` and did not set `context: log` for `severity_number` conditions. Current routing connector documentation uses `condition` directly and requires the `log` context for log-record fields such as `severity_number`. Updated the routing examples to use `context: log` for severity checks and `context: resource` for service-name checks.
- The service-based routing example used `resource.attributes["service.name"]` inside routing connector conditions. In the routing connector's `resource` context, resource attributes are referenced as `attributes["service.name"]`. Updated both service-name conditions.
- The filter processor example used the legacy `logs.log_record` configuration shape. Current filter processor documentation for v0.146.0 and later documents `log_conditions` with log paths such as `log.severity_number`. Updated the example and the explanatory text accordingly.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated the snippet to configure a Prometheus pull reader with `host` and `port`.

## Review Notes
The severity-number mapping and `otelcol_exporter_sent_log_records` metric name are consistent with current OpenTelemetry documentation. A local `otelcol-contrib` binary was not available in the workspace, so configuration validation was performed against official documentation rather than by running `otelcol-contrib validate`.
