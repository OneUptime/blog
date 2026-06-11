# Validation Summary: How to Create OpenTelemetry B3 Propagation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- B3 propagation
- W3C Trace Context
- Node.js / TypeScript
- OpenTelemetry JavaScript SDK
- Python
- Flask
- OpenTelemetry Collector
- Envoy / Istio trace propagation
- OTLP HTTP export

## Sources Consulted
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenZipkin B3 propagation specification: https://github.com/openzipkin/b3-propagation
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- Istio distributed tracing overview and FAQ: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/ and https://istio.io/latest/about/faq/distributed-tracing/
- Envoy tracing documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing

## Issues Found
- The Node.js setup imported `Resource` from `@opentelemetry/resources` and used `new Resource(...)`. Current OpenTelemetry JS 2.x exposes `resourceFromAttributes(...)` for this usage, and the original snippet fails TypeScript compilation. Updated the import and SDK resource configuration.
- The sequence diagram used invalid toy B3 values such as `abc123-span2-1-span1`. B3 trace IDs and span IDs must be fixed-length hexadecimal identifiers. Replaced the examples with valid 32-hex-character trace IDs and 16-hex-character span IDs.
- The propagation explanation said each service creates a child span and injects new B3 headers in a way that implied B3's propagated span ID was the newly created server span. Clarified that a service creates a server span with the extracted context as parent and injects the active outbound span context for downstream calls.
- The service mesh recommendation said Envoy/Istio are often B3 by default. Current Envoy and Istio documentation supports both B3 and W3C-oriented configurations depending on the tracing provider. Updated the table to avoid an over-specific default claim.
- The Collector section said context propagation can be configured at the receiver level. The Collector receives and forwards telemetry; application SDKs handle B3 HTTP propagation. Reworded the section to make the Collector's role accurate.
- The troubleshooting table referred to "Duplicate trace IDs" from multiple propagators. Multiple propagators injecting does not create duplicate trace IDs; it creates multiple propagation headers. Updated the issue text.

## Review Notes
- TypeScript snippets were checked against current npm packages: `@opentelemetry/resources` 2.7.1, `@opentelemetry/propagator-b3` 2.7.1, `@opentelemetry/core` 2.7.1, and `@opentelemetry/sdk-node` 0.218.0.
- Python imports and exporter construction were checked against current PyPI packages: `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-propagator-b3`, `opentelemetry-exporter-otlp`, `opentelemetry-instrumentation-requests`, and `opentelemetry-instrumentation-flask` 1.42.1 / matching current releases.
- `include_metadata: true` in the Collector example is valid receiver configuration, but it is not required for normal trace ID and span parent preservation through an OTLP traces pipeline.
