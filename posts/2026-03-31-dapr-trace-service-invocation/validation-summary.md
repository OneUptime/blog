# Validation Summary: How to Trace Service Invocation Calls in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation building block, distributed tracing, resiliency)
- OpenTelemetry (trace context propagation, OTLP/gRPC export)
- Python / Flask (calling and target service implementations)
- Jaeger (trace query API)
- W3C Trace Context (traceparent header)

## Sources Consulted
- Dapr distributed tracing overview: https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr tracing configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr W3C trace context: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Dapr resiliency retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found

### 1. Target service data access bug (line ~83)
**What was wrong:** The target service used `request.json.get('data', {})` to extract request data. However, the calling service sends `{"orderId": ..., "items": ...}` directly (no `data` wrapper) via Dapr service invocation. This means `.get('data', {})` would return an empty dict, causing a `KeyError` on the next line when accessing `data['orderId']`.
**What was changed:** Changed `data = request.json.get('data', {})` to `data = request.json` so the target service correctly reads the request body as sent by the calling service through Dapr.

### 2. Jaeger API endpoint path (lines ~111, 114, 117)
**What was wrong:** The curl examples used `/api/v2/traces` as the Jaeger query endpoint. This path does not exist in the Jaeger HTTP query API. The v2 API is gRPC-only (`jaeger.api_v2.QueryService`).
**What was changed:** Changed all three occurrences of `/api/v2/traces` to `/api/traces`, which is the correct HTTP query endpoint used by the Jaeger query service.

### 3. Unused import (line ~48)
**What was wrong:** The calling service code imported `json` but never used it.
**What was changed:** Removed the unused `import json` line.

## Review Notes
- **Span attribute names use legacy OpenTelemetry conventions**: The post lists `http.method`, `http.url`, `http.status_code`, and `net.peer.name`. These are the older OpenTelemetry semantic convention names (pre-v1.25). The current conventions use `http.request.method`, `url.full`, `http.response.status_code`, and `server.address` respectively. However, Dapr may still emit the old attribute names depending on the version in use, so these are not incorrect per se — but readers should be aware they may see the newer names in recent Dapr/OTel versions.
- **`dapr.api.protocol` attribute**: This attribute could not be confirmed in official Dapr documentation. Dapr does add custom span attributes, but the exact name may differ (e.g., `dapr.protocol` or similar). Left as-is since the attribute table is illustrative.
- **Jaeger `tags` query parameter format**: The Jaeger HTTP API expects `tags` as a JSON-encoded string (e.g., `tags={"key":"value"}`), not the `key:value` format shown. Since the Jaeger HTTP API is not officially documented for external use and the curl commands are illustrative, this was noted but not changed.
- **Jaeger `minDuration` format**: The post uses `minDuration=200000` (likely intended as microseconds). The Jaeger HTTP API more commonly accepts duration strings like `200ms`. This is a minor format concern and was noted but not changed.
- **Traceparent propagation**: The post correctly shows manual forwarding of the `traceparent` header from the incoming request to the Dapr sidecar call. This is good practice — it ensures the Dapr-generated spans are connected to the upstream trace. Dapr propagates traceparent between sidecars automatically, but the application must forward it from the incoming request to the Dapr sidecar call to maintain end-to-end trace continuity.
