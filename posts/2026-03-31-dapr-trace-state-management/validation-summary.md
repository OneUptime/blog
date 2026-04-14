# Validation Summary: How to Trace State Management Operations in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, distributed tracing)
- Redis (as state store backend)
- Python / Flask (application code)
- Jaeger (trace backend / query API)
- OpenTelemetry Collector (spanmetrics connector)

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Redis state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr observability / tracing documentation: https://docs.dapr.io/operations/observability/tracing/
- Dapr source code (`pkg/diagnostics/http_tracing.go`, `pkg/api/http/http.go`) for span name and attribute verification
- Jaeger HTTP API documentation: https://www.jaegertracing.io/docs/apis/#http-json
- OpenTelemetry Collector Contrib spanmetrics connector: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/spanmetricsconnector

## Issues Found

1. **Incorrect span names in code comments**: The blog claimed Dapr creates spans named `dapr.state.get`, `dapr.state.set`, `dapr.state.transaction`, and `dapr.state.bulk`. Dapr actually names spans based on the HTTP request path (e.g., `/v1.0/state/redis-state/{key}`). Fixed the comments to remove the fabricated span names.

2. **Incorrect trace attribute table**: Multiple errors in the span attributes table:
   - `db.system` was listed as `redis` but Dapr sets it to `state`.
   - `db.statement` was listed as "key name" but Dapr sets it to the full HTTP method and path (e.g., `GET /v1.0/state/redis-state/order123`).
   - `net.peer.name` and `net.peer.port` were listed but are not set by Dapr for state operation spans.
   - Added the `db.name` attribute (store name) which Dapr does set but was missing from the table.

3. **Incorrect Jaeger API endpoint**: The blog used `/api/v2/traces` but Jaeger's query API uses `/api/traces` (no `v2` prefix). The `v2` endpoint is for Zipkin-format span ingestion, not querying.

4. **Incorrect Jaeger `minDuration` format**: The blog used `minDuration=100000` (bare integer). Jaeger parses this using Go's `time.ParseDuration`, which requires duration strings like `100ms`. Fixed to `minDuration=100ms`.

5. **Incorrect Jaeger operation name**: The blog used `operation=DaprStateGet` which is not a real Dapr span operation name. Removed the operation parameter from the example query since the actual operation names are HTTP paths that vary by request.

6. **Outdated OTel Collector spanmetrics config**: The blog used the deprecated `processors: spanmetrics` format with incorrect field names (`metrics_exporter`, `latency_histogram_buckets`). The spanmetrics processor has been replaced by the spanmetrics connector. Fixed to use the connector format with `connectors: spanmetrics` and the correct `histogram.explicit.buckets` field structure.

## Review Notes
- The Dapr state management API endpoints, request/response formats, and component YAML are all correct.
- The Python/Flask application code is syntactically correct and uses the Dapr HTTP API properly.
- The 204 status code check for missing state keys is correct per Dapr's API spec.
- The N+1 pattern explanation and bulk GET optimization advice are sound.
- The transactional state operation format is correct.
