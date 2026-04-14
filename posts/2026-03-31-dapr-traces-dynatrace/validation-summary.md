# Validation Summary: How to Send Dapr Traces to Dynatrace

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Dynatrace (observability platform)
- OpenTelemetry Collector (otlphttp exporter)
- Kubernetes (secrets, ConfigMaps, Deployments)
- DQL (Dynatrace Query Language)

## Sources Consulted
- Dapr documentation for Configuration CRD tracing spec (`spec.tracing.otel` fields: `endpointAddress`, `isSecure`, `protocol`)
- Dynatrace OTLP ingest endpoint documentation (`/api/v2/otlp` with `Api-Token` authorization header)
- Dynatrace API token scopes (`openTelemetryTrace.ingest`)
- Dynatrace Environment API v2 reference (verified `api/v2/entities` endpoint exists; confirmed `api/v2/distributed-tracing/spans` does NOT exist)
- OpenTelemetry Collector configuration reference (otlphttp exporter, batch processor, resource processor)
- Cross-referenced with other posts in the Dapr traces series (Jaeger, Datadog, Grafana Tempo, Elastic APM) for consistency

## Issues Found
1. **Fabricated Dynatrace API endpoint in Verification section**: The original post used `curl` against `api/v2/distributed-tracing/spans` with query parameters `spanField` and `spanValue`. This endpoint does not exist in the Dynatrace Environment API v2. Dynatrace does not expose a simple REST GET endpoint for listing/searching spans. Replaced with: (a) checking OTel Collector logs via `kubectl logs`, (b) instructions to verify in the Dynatrace Distributed Traces UI, and (c) a correct `api/v2/entities` API call to confirm service discovery.

## Review Notes
- The DQL query uses `span.kind == "client"` (lowercase). Dynatrace DQL may represent span kind values in uppercase (`"CLIENT"`). This is not definitively incorrect as DQL behavior may vary, but authors should verify against their environment.
- The `samplingRate` is set to `"0.1"` (10%), which is reasonable for production but may make initial verification harder. Consider noting that users may want to temporarily set it to `"1"` during setup to confirm traces flow end-to-end.
- The post correctly notes combining Dapr OTLP traces with Dynatrace OneAgent for full-stack visibility, which is a valid and useful pattern.
- All other configuration (OTel Collector YAML, Dapr Configuration CRD, Kubernetes annotations, DQL syntax, API token scope) is technically correct and consistent with the rest of the blog series.
