# Validation Summary: How to Use OpenTelemetry to Compare API Performance Across Blue-Green

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry resource attributes, traces, and metrics
- OTLP trace and metric exporters
- Kubernetes Deployments
- Prometheus and PromQL
- Canary and blue-green deployment analysis

## Sources Consulted
- OpenTelemetry JavaScript Resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript Instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus compatibility guidance: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The OpenTelemetry setup used `new Resource(...)` from `@opentelemetry/resources`, but the current JavaScript docs and package exports use `resourceFromAttributes(...)`. Updated the import and resource initialization.
- The OpenTelemetry setup configured only a trace exporter while the article later records custom metrics. Added `OTLPMetricExporter` and `PeriodicExportingMetricReader` so the metrics examples have an SDK metric export path.
- The Kubernetes `apps/v1` Deployment manifest omitted the required `.spec.selector` and matching `.spec.template.metadata.labels`. Added labels and a matching selector.
- The PromQL latency query used `api_request_duration_bucket`, but OpenTelemetry-to-Prometheus default translation includes the unit suffix for the `ms` histogram. Updated it to `api_request_duration_milliseconds_bucket`.
- The canary health ObservableGauge was created but never observed a value. Added a `latestHealthScore` variable and an `addCallback` observer, and declared the backend-specific `fetchVersionMetrics` function used by the example.

## Review Notes
The trace analytics query remains intentionally backend-specific pseudocode; syntax for `span.status`, `error.type`, and subqueries depends on the tracing backend. Prometheus metric names can also vary if a collector/exporter uses a non-default translation strategy, so readers should confirm names in their own backend.
