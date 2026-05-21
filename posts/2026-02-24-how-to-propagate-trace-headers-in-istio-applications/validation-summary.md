# Validation Summary: How to Propagate Trace Headers in Istio Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio distributed tracing
- Envoy trace and request headers
- B3 and W3C Trace Context propagation
- Python Flask and requests
- Go net/http and gRPC metadata
- Node.js Express and Axios
- Java Spring Boot RestTemplate and WebClient
- OpenTelemetry Python
- Kubernetes kubectl and Istio sample workloads

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Spring Framework `ServerWebExchangeContextFilter` API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/filter/reactive/ServerWebExchangeContextFilter.html
- Spring Framework WebClient filters documentation: https://docs.spring.io/spring-framework/reference/web/webflux-webclient/client-filter.html
- OpenTelemetry Python instrumentation and propagators documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- grpc-go metadata package documentation: https://pkg.go.dev/google.golang.org/grpc/metadata

## Issues Found
- The Spring WebFlux `WebClient` example called `ServerWebExchangeContextFilter.get(...)` with a request attribute. The current Spring API exposes `getExchange(ContextView)`, so the original snippet would not compile. Updated it to use `Mono.deferContextual(...)` and `ServerWebExchangeContextFilter.getExchange(contextView)`.
- The OpenTelemetry Python section implied automatic propagation without noting the default propagation format. Added the B3 caveat because OpenTelemetry Python defaults to W3C Trace Context and W3C Baggage, while Istio/Zipkin deployments may require B3 propagation to be configured.
- The testing commands used `deploy/sleep` without first deploying the Istio sleep sample. Added the sleep sample deployment command.
- The testing text implied that a direct `sleep` to `httpbin` request validates application-level propagation. Clarified that this only confirms sidecar-added headers for that request, and that application propagation should be verified by having the application call `httpbin` and comparing trace IDs.

## Review Notes
The main Istio claim is accurate: applications must forward trace context headers from inbound requests to outbound requests so sidecar-generated spans can be joined into one trace. The language-specific manual propagation examples are illustrative snippets and omit imports/error handling in places, but the propagation approach is technically sound.
