# Validation Summary: How to Route Telemetry to Multiple Backends with the Routing Connector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Transformation Language (OTTL)
- OTLP receiver and exporter
- Prometheus receiver
- Prometheus Remote Write exporter
- Collector TLS configuration

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing connector trace and metric sample configs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector/testdata/config
- OpenTelemetry Transformation Language documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OTTL resource, span, and metric context path documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts
- OTTL converter functions, including IsMatch: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector component exporter list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector TLS configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- Replaced deprecated/removed `logging` exporter examples with the current `debug` exporter. The `logging` exporter was removed from official Collector distributions starting in v0.111.0.
- Added `context: span` to routes that inspect span attributes or span fields. Without this, the routing connector's default `resource` context would evaluate unqualified `attributes[...]` as resource attributes.
- Corrected mixed span/resource routing conditions so service names remain resource attributes when evaluated in span context.
- Replaced invalid OTTL regex `matches` operator usage with the supported `IsMatch(...)` converter function.
- Corrected external HTTP client routing from `attributes["span.kind"]` and `attributes["http.url"]` to `span.kind.string` and `attributes["url.full"]`, matching current span context paths and HTTP semantic convention naming.
- Added `context: metric` to metric-name routing rules so `metric.name` is evaluated in the correct OTTL context.
- Corrected exporter TLS examples to use `ca_file` for server certificate verification, and kept `cert_file` only with `key_file` for the mTLS example.
- Replaced an unverified routing-specific metric name with a more general recommendation to monitor Collector connector accepted/refused telemetry counts.

## Review Notes
The routing connector is currently alpha for traces, metrics, and logs in the Collector contrib and Kubernetes distributions. The examples are otherwise aligned with the current routing connector configuration model, including `default_pipelines`, `error_mode`, route ordering, and connector use as an exporter in an ingest pipeline and a receiver in routed pipelines.
