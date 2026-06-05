# Validation Summary: How to Use the Routing Connector to Send Error Traces to One Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib routing connector
- OTTL routing conditions
- OTLP receiver and exporter
- OpenTelemetry span status and HTTP semantic conventions
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector routing connector package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry Collector Contrib v0.120.0 release notes: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.120.0

## Issues Found
- The routing connector examples used `match_once`, which was deprecated in v0.116.0 and removed in v0.120.0. Removed `match_once` from all examples and updated the surrounding explanation to describe the current default `move` behavior.
- The routing table conditions referenced span fields such as `status.code`, `attributes["http.response.status_code"]`, and `attributes["exception.type"]` without setting `context: span`. The routing connector defaults to `resource` context, so those conditions would not evaluate against span data. Added `context: span` to the affected routing table entries.
- Added `error_mode: ignore` to routing connector examples that inspect optional span attributes. This prevents missing or incompatible attribute values from causing routing errors to propagate and drop payloads instead of falling back to the default pipeline.

## Review Notes
The post is technically valid after the corrections. The routing connector remains alpha for traces, metrics, and logs, so examples may need future updates if its configuration schema changes again.
