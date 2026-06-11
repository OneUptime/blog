# Validation Summary: How to Implement OpenTelemetry Jaeger Propagation

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- OpenTelemetry (Node.js, Python, Go SDKs)
- Jaeger propagation format (`uber-trace-id`, `uberctx-` baggage)
- W3C Trace Context (`traceparent`, `tracestate`)
- OpenTelemetry CompositePropagator
- Express.js, Flask, net/http (instrumentation contexts)
- OTLP/HTTP exporter
- nginx (proxy header forwarding)
- Mermaid diagrams (sequence + flowchart)

## Sources Consulted
- Jaeger client library documentation on propagation format: https://www.jaegertracing.io/docs/1.6/client-libraries/#propagation-format
- W3C Trace Context spec: https://www.w3.org/TR/trace-context/
- OpenTelemetry JS API docs: https://open-telemetry.github.io/opentelemetry-js/
- `@opentelemetry/propagator-jaeger` package: https://www.npmjs.com/package/@opentelemetry/propagator-jaeger
- `@opentelemetry/core` (W3CTraceContextPropagator, CompositePropagator): https://www.npmjs.com/package/@opentelemetry/core
- `@opentelemetry/semantic-conventions` (`ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`): https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- Python `opentelemetry-propagator-jaeger`: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/propagator/opentelemetry-propagator-jaeger
- Python SDK resources module (re-exports `SERVICE_NAME`/`SERVICE_VERSION`): https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/resources/__init__.py
- Go contrib propagators/jaeger: https://pkg.go.dev/go.opentelemetry.io/contrib/propagators/jaeger
- Go otelhttp: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- Go semconv v1.24.0 helper functions: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0

## Issues Found
No technical issues found.

Verified items:
- `uber-trace-id` format `{trace-id}:{span-id}:{parent-span-id}:{flags}` matches Jaeger spec.
- Example trace ID (32 hex chars / 128-bit), span ID (16 hex chars / 64-bit), parent `0` (root), flag `1` (sampled) are all valid.
- `uberctx-{key}` is the correct Jaeger baggage header prefix.
- W3C `traceparent: 00-<trace-id>-<span-id>-<flags>` example is well-formed.
- Node.js package list, `JaegerPropagator` class, `NodeSDK` `textMapPropagator` option, `CompositePropagator`/`W3CTraceContextPropagator` exports from `@opentelemetry/core`, and `ATTR_SERVICE_NAME`/`ATTR_SERVICE_VERSION` constants are all valid current APIs.
- Python imports (`from opentelemetry.propagators.jaeger import JaegerPropagator`, `from opentelemetry.propagate import set_global_textmap`, `SERVICE_NAME`/`SERVICE_VERSION` from `opentelemetry.sdk.resources`) are correct.
- Go `jaeger.Jaeger{}` zero-value struct is the correct propagator type and `otel.SetTextMapPropagator` is the correct registration call.
- Manual `propagation.inject` / `propagation.extract` examples follow the documented API.
- Mermaid syntax (sequenceDiagram and flowchart TB/LR) is valid.

## Review Notes
- The `Resource` constructor pattern `new Resource({...})` in the Node.js examples still works in current versions of `@opentelemetry/resources`, though `resourceFromAttributes(...)` is the newer recommended helper in 2.x. The shown form remains functional and broadly compatible, so it was kept as-is.
- The Go example uses `defer tp.Shutdown(ctx)` which discards the returned error; acceptable for example code but production usage would typically check the error.
- The semconv version pin `v1.24.0` in the Go example is reasonable and current; users on newer semconv versions may need to update the import path.
- The post correctly notes that W3C is the OpenTelemetry default and recommends Jaeger propagation only for legacy/migration scenarios, which aligns with current OpenTelemetry guidance.
