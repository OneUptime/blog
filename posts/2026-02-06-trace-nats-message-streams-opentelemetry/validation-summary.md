# Validation Summary: How to Trace NATS Message Streams with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Go SDK
- W3C Trace Context propagation
- NATS Core
- NATS JetStream
- Go
- OpenTelemetry Collector

## Sources Consulted
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry messaging attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- NATS protocol documentation for headers: https://docs.nats.io/reference/reference-protocols/nats-protocol
- NATS JetStream headers documentation: https://docs.nats.io/nats-concepts/jetstream/headers
- NATS 2.11 release notes for distributed message tracing behavior: https://docs.nats.io/release-notes/whats_new/whats_new_211
- NATS Go client package documentation: https://pkg.go.dev/github.com/nats-io/nats.go

## Issues Found
- The tracer setup did not register a global text map propagator, so `otel.GetTextMapPropagator().Inject` would not reliably inject W3C Trace Context. Added `otel.SetTextMapPropagator(propagation.TraceContext{})` and the required import.
- The initial Go snippet imported `log` but did not use it, which would cause a compile error. Removed the unused import.
- The NATS header carrier snippet imported unused OpenTelemetry packages. Removed those unused imports.
- Several snippets used `span.SetAttribute(...)`, which is not part of the OpenTelemetry Go `trace.Span` API. Replaced those calls with `span.SetAttributes(...)` and typed `attribute.*` constructors.
- Messaging semantic convention attributes used outdated names such as `messaging.operation` and `messaging.message.payload_size_bytes`. Updated them to current attributes including `messaging.operation.name`, `messaging.operation.type`, and `messaging.message.body.size`.
- The introduction implied NATS itself cannot carry trace context. Adjusted the wording to clarify that NATS clients do not automatically inject or extract OpenTelemetry trace context.
- The JetStream redelivery explanation implied traces would automatically show a full redelivery chain. Revised it to state that redelivery attempts remain associated with the original publish trace.
- The Trace Context wording implied `tracestate` is always injected. Revised it to note that `tracestate` is injected when present.

## Review Notes
The code examples remain illustrative snippets rather than a single complete compilable program; application-specific types and functions such as `Order`, `processOrder`, and `handleOrder` are still assumed. NATS 2.11 added server-side distributed message tracing using `traceparent` or `Nats-Trace-Dest`, but that does not replace application-level OpenTelemetry span instrumentation for publisher and subscriber code.
