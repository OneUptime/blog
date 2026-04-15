# Validation Summary: How to Implement Custom Span Attributes in Dapr Traces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar tracing, Configuration resource, HTTP pipeline)
- OpenTelemetry (Python SDK and Go SDK)
- Jaeger (trace querying via REST API)
- Grafana Tempo (TraceQL query syntax)
- W3C Trace Context propagation

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Tracing Setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Supported Middleware Components: https://docs.dapr.io/reference/components-reference/supported-middleware/
- dapr/components-contrib middleware/http directory: https://github.com/dapr/components-contrib/tree/master/middleware/http
- OpenTelemetry Python API documentation (trace module, Span.set_attribute, get_current_span)
- OpenTelemetry Go API documentation (otel.Tracer, trace.SpanFromContext, attribute package)
- Grafana Tempo TraceQL documentation

## Issues Found

### 1. Non-existent Dapr middleware type `middleware.http.spanenricher`

**What was wrong:** The section "Adding Custom Attributes in the Dapr Config (Span Headers)" used `middleware.http.spanenricher` as a Dapr HTTP middleware type. This middleware does not exist in Dapr. The real Dapr HTTP middleware types are: `bearer`, `oauth2`, `oauth2clientcredentials`, `opa`, `ratelimit`, `routeralias`, `routerchecker`, `sentinel`, and `wasm`. Dapr has no built-in declarative mechanism for forwarding HTTP headers as span attributes.

**What was changed:** Replaced the entire section with a correct approach: passing custom metadata as HTTP headers during Dapr service invocation, then reading those headers in application code to set span attributes via the OpenTelemetry SDK. The section heading was updated to "Propagating Custom Context via Dapr Service Invocation Headers" to accurately reflect the content. A curl example demonstrates passing custom headers through Dapr's invoke API.

**Why:** The original YAML configuration would not work and would cause errors if a user tried to apply it. There is no equivalent declarative config approach in Dapr, so the fix shows the correct application-level approach.

## Review Notes
- The Python code example imports `TracerProvider`, `BatchSpanProcessor`, and `OTLPSpanExporter` but never uses them in the shown code. These are likely intended to represent setup code that exists elsewhere in the application. This is not technically wrong but could confuse readers who try to run the snippet as-is.
- The Dapr tracing configuration fields (`endpointAddress`, `isSecure`, `protocol`) are all correct for the current Dapr Configuration spec.
- The OpenTelemetry Python and Go API usage is correct and uses current, non-deprecated APIs.
- The Jaeger REST API query and Grafana Tempo TraceQL syntax are both correct.
- The post's core advice — use `trace.get_current_span()` (Python) or `trace.SpanFromContext(ctx)` (Go) to enrich Dapr-created spans rather than creating new root spans — is accurate and important.
