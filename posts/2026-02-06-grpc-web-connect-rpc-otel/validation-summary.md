# Validation Summary: How to Instrument gRPC-Web and Connect-RPC Services with OpenTelemetry for

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry context propagation
- gRPC-Web
- Connect-RPC / Connect-Web
- Connect-RPC for Go
- Envoy gRPC-Web and CORS configuration
- W3C Trace Context headers

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- Connect-Web clients documentation: https://connectrpc.com/docs/web/using-clients/
- Connect-Web interceptors documentation: https://connectrpc.com/docs/web/interceptors/
- Connect-Go interceptors documentation: https://connectrpc.com/docs/go/interceptors/
- Connect-Go observability documentation: https://connectrpc.com/docs/go/observability/
- Connect project overview and protocol support: https://connectrpc.com/
- Envoy gRPC-Web filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy CORS policy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Published package type definitions for @connectrpc/connect 2.1.1 and @improbable-eng/grpc-web 0.15.0 from npm

## Issues Found
- The browser OpenTelemetry setup used `new Resource(...)` and `provider.addSpanProcessor(...)`, which do not match the current OpenTelemetry JavaScript examples. Updated the snippet to use `resourceFromAttributes(...)`, `ATTR_SERVICE_NAME`, and the `spanProcessors` constructor option.
- The JavaScript examples referenced `trace.SpanKind.CLIENT` and `trace.SpanStatusCode.ERROR`, but `SpanKind` and `SpanStatusCode` are exported from `@opentelemetry/api`. Updated the imports and references.
- The Connect-Web example imported the service from `./gen/order_connect`, which reflects older generated-code layouts. Updated it to `./gen/order_pb`, matching current Connect v2 generated service descriptor usage.
- The Go snippet used `attribute.String(...)` and `codes.Error` without importing the required OpenTelemetry packages, and included an unused `orderv1` import. Added `go.opentelemetry.io/otel/attribute` and `go.opentelemetry.io/otel/codes`, and removed the unused import.
- The Envoy snippet suggested `traceparent` and `tracestate` are passed through by default and showed `request_headers_to_add` for `x-request-id`, which does not address browser CORS preflight requirements for trace headers. Replaced it with a CORS filter and route-level `CorsPolicy` allowing and exposing the relevant gRPC-Web and W3C trace context headers.

## Review Notes
- The `@improbable-eng/grpc-web` package still publishes usable APIs, and the example matches its current `grpc.unary` shape, but the upstream repository notes it is in maintenance mode and recommends the official grpc-web client for new projects.
- The Go server snippet is illustrative and assumes an `orderServer` implementation exists elsewhere.
