# Validation Summary: How to Build a Developer Self-Service Dashboard Catalog Powered by OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry metrics
- Prometheus / PromQL
- Python dataclasses
- Python OpenTelemetry metrics API
- Dashboard catalog API design

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry deployment attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html

## Issues Found
- The PromQL examples used `http_server_request_duration_count` and `http_server_request_duration_bucket`. With the default OpenTelemetry-to-Prometheus translation strategy, the `http.server.request.duration` metric has unit `s`, so the translated Prometheus histogram series include the `seconds` unit suffix. Updated the examples to use `http_server_request_duration_seconds_count` and `http_server_request_duration_seconds_bucket`.
- The examples used the deprecated `deployment.environment` attribute form after Prometheus label translation. OpenTelemetry now defines `deployment.environment.name` and marks `deployment.environment` deprecated. Updated the PromQL labels to `deployment_environment_name`.
- The latency panel title claimed P50 / P95 / P99 while the query only calculated `histogram_quantile(0.99, ...)`. Updated the title and description to describe P99 latency only.
- The latency panel used `ms` even though the OpenTelemetry HTTP request duration metric is specified in seconds. Updated the unit to `s`.
- The error-rate query filtered the numerator by environment but not the denominator. Updated the denominator to use the same `service_name` and `deployment_environment_name` selectors.
- The catalog API checked `var["required"]`, but the example `environment` variable did not define a `required` key. Updated the code to use `var.get("required", False)` so optional variables with defaults do not raise `KeyError`.
- Added a short caveat that the PromQL examples assume the backend exposes OpenTelemetry resource attributes as labels and uses the standard OpenTelemetry-to-Prometheus name translation. This reflects the OpenTelemetry Prometheus exporter specification, where copying resource attributes into metric labels is configurable and not enabled by default for all exporters.

## Review Notes
The CLI commands are illustrative for a custom `otel-dashboard` tool rather than commands from an official OpenTelemetry CLI, so they were reviewed for internal consistency rather than against an external command reference. The template versioning example remains intentionally simplified; a production implementation should track explicit template versions instead of inferring outdated instances from panel count alone.
