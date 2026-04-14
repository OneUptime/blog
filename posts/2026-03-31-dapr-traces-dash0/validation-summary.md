# Validation Summary: How to Send Dapr Traces to Dash0

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar-based microservice runtime)
- Dash0 (OpenTelemetry-native observability platform)
- OpenTelemetry Collector
- Kubernetes (secrets, ConfigMaps, annotations)
- OTLP (OpenTelemetry Protocol) over gRPC

## Sources Consulted
- Dapr Configuration spec and tracing documentation (https://docs.dapr.io/operations/configuration/configuration-overview/, https://docs.dapr.io/operations/observability/tracing/otel-collector/)
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr service invocation API reference (https://docs.dapr.io/reference/api/service_invocation_api/)
- Dash0 OTLP ingestion documentation (https://www.dash0.com/documentation)
- OpenTelemetry Collector configuration documentation (https://opentelemetry.io/docs/collector/configuration/)
- OpenTelemetry OTLP exporter documentation (https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter)

## Issues Found

### 1. Incorrect claim that Dapr does not support custom headers in OTel config
- **What was wrong:** Line 53 stated "Dapr's OTel configuration does not support custom headers directly." This is incorrect — Dapr supports a `headers` field under `spec.tracing.otel` that accepts header name/value pairs with `secretKeyRef` support for Kubernetes secrets.
- **What was changed:** Updated the note to acknowledge native header support while still recommending the OTel Collector for production (batching, processing, multi-backend fanout).
- **Why:** The original claim would mislead readers into thinking they must use an OTel Collector when direct export with auth is actually supported.

### 2. Incorrect Dash0 alerting navigation path and metric name
- **What was wrong:** The alerting section said to "Navigate to Alerts > Create Alert" and "Select metric: `span.duration`". Dash0's alerting is under "Monitoring > Alerting" and the correct metric name is `dash0.spans.duration` (a native histogram).
- **What was changed:** Updated the navigation path to "Monitoring > Alerting" and the metric reference to `dash0.spans.duration` histogram with p99 quantile.
- **Why:** The original path and metric name did not match Dash0's documented UI and metric naming conventions.

### 3. Fabricated query syntax
- **What was wrong:** The "Querying Trace Data" section showed a SQL-like query syntax (`service.name = "order-service" AND span.kind = "server" AND span.duration > 500ms`) that does not match any documented Dash0 query language. Dash0 uses a filter bar for trace exploration and PromQL for metric queries.
- **What was changed:** Replaced with accurate guidance: filter bar syntax for trace attribute filtering, and a note about PromQL for metric-based latency analysis using `dash0.spans.duration`.
- **Why:** The fabricated syntax could confuse readers trying to use it in the Dash0 UI.

## Review Notes
- All Dapr configuration resources (`apiVersion: dapr.io/v1alpha1`, `kind: Configuration`) use correct field names and types (`endpointAddress`, `isSecure`, `protocol`, `samplingRate`).
- All Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/config`) are correct.
- The OpenTelemetry Collector configuration is fully correct: OTLP receiver, batch processor, resource processor, named exporter (`otlp/dash0`), environment variable substitution, and pipeline definition all follow OTel Collector conventions.
- Processor ordering `[resource, batch]` is correct — resource enrichment before batching is the recommended practice.
- The OTLP exporter correctly relies on implicit TLS for the remote Dash0 endpoint (TLS is enabled by default for non-localhost targets).
- The Dash0 OTLP endpoint format (`ingress.<region>.aws.dash0.com:4317`) and Bearer token authentication are correct.
- The batch processor `timeout: 5s` is valid but notably higher than the default 200ms. This is a reasonable choice for reducing export frequency but readers should be aware of the latency tradeoff.
- The "Latency distribution histograms" claim in the UI features section is slightly imprecise — Dash0 renders percentile line charts rather than traditional histogram bar charts, but this is a minor distinction that does not warrant a correction.
