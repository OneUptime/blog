# Validation Summary: How to Use Priority-Based Routing: Send Critical Service Traces to Fast

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry routing connector
- OpenTelemetry Transformation Language (OTTL)
- OTLP receiver and exporter
- Batch processor
- Probabilistic sampler processor
- Kubernetes attributes processor
- Kubernetes pod labels

## Sources Consulted
- OpenTelemetry routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector connector overview: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry OTTL span context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OpenTelemetry trace API status documentation: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Kubernetes attributes processor documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry probabilistic sampler processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/samplingprocessor/probabilisticsamplerprocessor
- OpenTelemetry nop exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/nopexporter
- OpenTelemetry Collector gRPC compression configuration documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configgrpc

## Issues Found
- Routing connector examples used `statement: route() where resource.attributes[...]`. The current routing connector supports `condition`, and resource-context examples use `attributes[...]`. Updated the routing snippets to use `context: resource` with `condition: attributes[...]`.
- The drop pipeline used the `debug` exporter, which exports/logs data instead of discarding it. Updated the drop pipeline to use the `nop` exporter.
- The error override checked `attributes["otel.status_code"] == "ERROR"`, which is not the OTLP span status path in OTTL. Updated it to use `context: span` and `condition: status.code == STATUS_CODE_ERROR`.

## Review Notes
- The routing connector is still marked alpha for traces in current documentation, so production users should validate behavior against the Collector distribution and version they deploy.
- The error override routes matching error spans to hot storage. Routing by full trace-level error presence requires trace-aware processing, such as tail sampling or another trace-grouping approach, if the goal is to keep every span from a trace that contains an error.
