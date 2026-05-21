# Validation Summary: How to Propagate Trace Headers in Go Applications with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio distributed tracing
- Go context and net/http
- gRPC Go interceptors and metadata
- Chi router
- Gin framework
- OpenTelemetry Go HTTP instrumentation and propagation
- B3 and W3C trace context headers

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Go context package documentation: https://pkg.go.dev/context
- Go net/http package documentation: https://pkg.go.dev/net/http
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- grpc-go metadata package documentation: https://pkg.go.dev/google.golang.org/grpc/metadata
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go insecure credentials documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go B3 propagator documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/propagators/b3
- OpenTelemetry Go otelhttp documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

## Issues Found
- The tracing package example kept `traceHeaderNames` and `headersKey` private, but later Gin code called `tracing.TraceHeaderNames()` and `tracing.HeadersKey`, which were not defined. Added `TraceHeaderNames()` and `WithHeaders()` helpers and updated middleware and Gin examples to use them.
- The gRPC server interceptor used `http.Header` without importing `net/http`. Added the missing import.
- The gRPC client interceptor used `metadata.NewOutgoingContext`, which replaces existing outgoing metadata. Changed it to `metadata.AppendToOutgoingContext` so existing metadata is preserved.
- The gRPC client example used deprecated `grpc.WithInsecure()`. Replaced it with `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The gRPC section claimed to show unary and streaming interceptors, but only unary interceptors were included. Updated the wording to say the examples are unary and streaming RPCs need analogous streaming interceptors.
- The OpenTelemetry section was labeled auto-instrumentation but showed explicit HTTP instrumentation with `otelhttp`. Renamed it to OpenTelemetry HTTP Instrumentation.
- The OpenTelemetry propagator setup claimed to configure B3 and W3C formats but only configured W3C TraceContext and Baggage. Added the official B3 propagator package and configured both B3 single-header and multi-header injection alongside W3C propagation.
- The OpenTelemetry example imported `context` and declared a local HTTP client without using either, which would not compile. Removed the unused import and made the traced HTTP client a package-level variable.
- The goroutine pitfall described closure capture as a cancellation problem even though explicitly passing the same request context has the same cancellation behavior. Updated the comment to describe the real issue: hiding context use in the closure.

## Review Notes
The manual header propagation approach is technically valid for Istio because Istio requires applications to forward trace context headers between inbound and outbound requests. OpenTelemetry instrumentation is generally preferable for production services because it handles extraction and injection through standard propagators and avoids hand-maintaining header lists.
