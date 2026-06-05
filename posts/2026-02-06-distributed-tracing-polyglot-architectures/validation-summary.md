# Validation Summary: How to Implement Distributed Tracing for Polyglot Architectures

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- W3C Trace Context
- Distributed tracing and context propagation
- Go net/http and otelhttp
- Java Spring Boot and OpenTelemetry Java agent
- Python Flask, requests, and OpenTelemetry Python SDK
- Node.js Express and OpenTelemetry JavaScript SDK
- OTLP gRPC export to the OpenTelemetry Collector

## Sources Consulted
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry Go otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/

## Issues Found
- The `traceparent` example used an unrealistically short trace ID placeholder and described only the trace ID. Updated the example and explanation to reflect the W3C fields more accurately.
- The Go example said `otelhttp.NewHandler` propagates context to outgoing requests. Updated the comment to say it extracts context from incoming requests; outgoing injection is handled by `otelhttp.NewTransport`.
- The Go gateway called the Java auth service without forwarding the `Authorization` header, while the Java endpoint required it. Updated the Go request to pass the header through.
- The Go client examples did not close response bodies. Added response body cleanup for the downstream calls.
- The Java auth endpoint returned `"invalid"` with HTTP 200, which did not match the gateway's status-code check. Updated it to throw `ResponseStatusException` with HTTP 401 for invalid tokens.
- The Java agent command sent OTLP to port 4317 without explicitly selecting gRPC. Added `-Dotel.exporter.otlp.protocol=grpc` because current Java agent versions can default to HTTP/protobuf.
- The Python example imported `set_global_textmap` from an invalid module and imported `TraceContextTextMapPropagator` from the wrong path. Updated both imports to the documented OpenTelemetry Python locations.
- The Node.js example used the outdated `new Resource(...)` OpenTelemetry JS API. Updated it to use `resourceFromAttributes(...)` and current semantic convention constants.
- The examples used the older `deployment.environment` attribute. Updated examples to `deployment.environment.name`, matching current OpenTelemetry resource guidance.
- The pitfalls section suggested configuring the Collector to translate propagation formats. Updated it to advise configuring services to extract all required formats during migration, because app-to-app header propagation happens inside the services.
- The sampling guidance did not mention parent-based downstream sampling. Updated it so downstream services honor the propagated sampling decision.

## Review Notes
The snippets are still illustrative and omit production concerns such as dependency versions, error recording on spans, body parsing validation, shutdown error handling, and full Collector configuration. The core tracing, propagation, and exporter concepts are now technically accurate against current OpenTelemetry documentation.
