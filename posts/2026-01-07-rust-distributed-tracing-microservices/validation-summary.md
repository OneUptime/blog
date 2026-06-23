# Validation Summary: How to Implement Distributed Tracing in Rust Microservices

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Rust
- OpenTelemetry
- tracing and tracing-opentelemetry
- Axum
- reqwest
- Tonic and gRPC metadata
- Kafka and rust-rdkafka
- W3C Trace Context

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry context propagation concepts: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry Rust API docs for global text map propagators, Extractor, Injector, Status, and tracing: https://docs.rs/opentelemetry/latest/opentelemetry/
- tracing-opentelemetry OpenTelemetrySpanExt docs: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/trait.OpenTelemetrySpanExt.html
- Axum middleware docs: https://docs.rs/axum/latest/axum/middleware/
- Tonic interceptor, Request, and metadata docs: https://docs.rs/tonic/latest/tonic/
- rust-rdkafka FutureProducer and message header docs: https://docs.rs/rdkafka/latest/rdkafka/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/

## Issues Found
- HTTP server middleware created a manual OpenTelemetry span but did not attach it to the request future or connect it to the `tracing` span. Changed it to use `tracing_opentelemetry::OpenTelemetrySpanExt::set_parent` on the `tracing` span that instruments the request.
- HTTP client created a client span context but did not instrument the outbound request future with the same span. Changed it to create a `tracing` client span, inject that span's OpenTelemetry context, and instrument the `reqwest` send future.
- Several HTTP span attributes used older semantic convention names such as `http.method`, `http.status_code`, and `http.flavor`. Updated them to current names such as `http.request.method`, `http.response.status_code`, and `network.protocol.version`.
- Tonic server interceptor created a span that ended before the RPC handler ran. Changed the interceptor to extract and store the parent context in request extensions, then set it as the parent of each handler's active `tracing` span.
- Tonic server snippet imported `Status` twice in the same module. Removed the duplicate import.
- Tonic client snippet created a client span but injected `Context::current()`, so the created span was not propagated. Changed the helper to inject an explicit context from the client span and instrument the RPC call with that span.
- Tonic metadata injection used `MetadataValue::try_from(&value)`, which is less direct than the documented string conversion. Changed it to `MetadataValue::try_from(value.as_str())`.
- Kafka producer manually created an OpenTelemetry span and relied on context lifetime rather than instrumenting the send future. Changed it to use a `tracing` producer span, inject that span's context into Kafka headers, and instrument the send future.
- Kafka consumer attached an OpenTelemetry context across async handler execution. Changed it to set the extracted parent context on a `tracing` consumer span and instrument the handler future with that span.
- Kafka consumer used `headers.iter()` without importing the `rdkafka::message::Headers` trait. Added the trait import.

## Review Notes
The examples still assume that the application has configured a global W3C trace-context propagator and a `tracing-opentelemetry` layer. The post states that OpenTelemetry handles propagation when configured correctly, but a future improvement could include a short setup snippet showing the propagator and subscriber initialization.
