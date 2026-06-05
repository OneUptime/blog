# Validation Summary: How to Test OpenTelemetry Context Propagation Across Service Boundaries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry context propagation
- W3C Trace Context
- HTTP distributed tracing
- gRPC Python interceptors
- OpenTelemetry gRPC instrumentation
- Kafka message headers with confluent-kafka-python
- pytest integration testing

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python gRPC instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html
- gRPC interceptor documentation: https://grpc.io/docs/guides/interceptors/
- OpenTelemetry confluent-kafka instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/confluent_kafka/confluent_kafka.html

## Issues Found
- The HTTP example attempted to pass a string into `TracerProvider.add_span_processor()`, which expects a span processor such as `SimpleSpanProcessor`. Removed the invalid call and imported `SimpleSpanProcessor` directly.
- The HTTP example described a shared in-memory exporter as if it applied to arbitrary service boundaries. Clarified that this only works for local test services running in the same process, and that separate processes should export to a test collector or backend.
- The HTTP test accepted an unused `service_b_url` fixture. Removed it because Service A calls Service B internally and the fixture is not used by the test.
- The gRPC example said it was testing interceptors but created a plain `grpc.insecure_channel()` with no OpenTelemetry client interceptor. Added `grpc.intercept_channel(..., client_interceptor())`.
- The gRPC example filtered server spans by span name containing `grpc.server`, which is not a reliable OpenTelemetry gRPC span naming rule. Updated the filter to use `SpanKind.SERVER` and the `rpc.system == "grpc"` attribute, and added an assertion that server spans were actually recorded.
- The Kafka example imported unused modules and did not check `Message.error()` after `Consumer.poll()`. Removed unused imports and added the documented error check.
- The Kafka header extraction assumed `msg.headers()` and every header value were non-null. Updated it to handle missing headers and skip null header values before decoding.

## Review Notes
The examples are now syntactically valid Python. In a real multi-process integration test, the in-memory exporter must be replaced with a collector or test tracing backend that all services export to.
