# Validation Summary: How to Handle Distributed Tracing Across Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- W3C Trace Context
- OpenTelemetry Python SDK and instrumentation for Flask, requests, gRPC, baggage, and propagation
- OpenTelemetry Go SDK and otelhttp instrumentation
- Kafka and RabbitMQ-style message propagation
- gRPC Python interceptors
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python propagate API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python baggage propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.propagation.html
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry context propagation concepts: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry semantic conventions for deployment resource attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry semantic conventions for messaging: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry semantic conventions for Kafka: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- Go otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- Go OpenTelemetry codes package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/codes
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html

## Issues Found
- The `traceparent` examples used shortened trace and span IDs that are not valid W3C Trace Context header values. Updated them to valid 32-hex-character trace IDs and 16-hex-character parent span IDs.
- The Python and Go resource examples used deprecated `deployment.environment`. Updated them to `deployment.environment.name`.
- The Go example referenced `bytes`, `io`, and `codes` without importing them. Added the required imports.
- The manual propagation example imported and instantiated `TraceContextTextMapPropagator` without using it. Removed the unused propagator setup and kept the global `inject` / `extract` usage.
- Messaging examples used older semantic attributes such as `messaging.destination`, `messaging.destination_kind`, `messaging.kafka.partition`, `messaging.kafka.consumer_group`, and `messaging.message_id`. Updated them to current semantic convention names where applicable.
- The Kafka example used `json.dumps` and `json.loads` without importing `json`. Added the import.
- The gRPC manual client interceptor attempted to instantiate `grpc.ClientCallDetails` directly and omitted current fields such as `wait_for_ready` and `compression`. Replaced it with a namedtuple-compatible call details object.
- The gRPC manual server interceptor created a span only around handler lookup, not around RPC execution. Updated the unary-unary example to wrap the returned RPC method handler.
- The baggage example created a baggage context but did not attach it before making the downstream request, so automatic requests instrumentation would not propagate it. Attached and detached the context around the downstream call.

## Review Notes
Python code blocks were syntax-checked with `ast.parse`. Go compilation could not be performed because the `go` binary is not installed in the review environment. Messaging semantic conventions are still marked Development in the OpenTelemetry specification, so future updates may require revisiting those attribute names.
