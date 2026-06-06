# Validation Summary: How to Configure Context Propagation in Mixed Java/Python/Node.js Systems

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context
- W3C Baggage
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Java SDK and Java agent
- OpenTelemetry Python SDK
- Flask, FastAPI, requests, httpx
- OTLP/gRPC exporters

## Sources Consulted
- OpenTelemetry General SDK Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Java SDK Configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java Agent Configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry JavaScript Propagation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript Instrumentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript NodeSDK README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JavaScript `@opentelemetry/core` API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_core.html
- OpenTelemetry JavaScript `@opentelemetry/exporter-trace-otlp-grpc` API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry Python Instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Propagation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python `opentelemetry.propagate` API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python `opentelemetry.sdk.resources` API docs: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Service semantic convention: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/

## Issues Found
- The post said each SDK defaults only to W3C Trace Context. Updated this to say SDKs commonly default to W3C Trace Context and W3C Baggage, matching the documented `tracecontext,baggage` default.
- The post said all OpenTelemetry SDKs read `OTEL_PROPAGATORS`. Narrowed the claim to the Java, Python, and Node.js SDKs covered by the article.
- The Java agent example used the OTLP/gRPC port but did not set the Java agent protocol. Added `-Dotel.exporter.otlp.protocol=grpc` because OpenTelemetry Java agent 2.x defaults to `http/protobuf`.
- The Java manual SDK example used the deprecated `io.opentelemetry.semconv.ResourceAttributes` class. Replaced it with `AttributeKey.stringKey("service.name")` and `Attributes.of(...)`.
- The Python propagation example imported `TraceContextTextMapPropagator` from the wrong module. Changed it to `opentelemetry.trace.propagation.tracecontext`.
- The Flask example used `request.json` without importing `request`. Added `request` to the Flask import.
- The Node.js baggage example destructured an unused `baggage` value from `@opentelemetry/api`. Removed it and kept the documented `propagation.createBaggage` / `propagation.setBaggage` APIs.
- The baggage forwarding explanation incorrectly implied auto-instrumentation generally forwards raw baggage headers even without the baggage propagator. Reworded it to explain that services need baggage extraction/re-injection, and raw header pass-through only happens when application or proxy code explicitly forwards that header.

## Review Notes
The remaining examples are intentionally illustrative and assume application-specific functions such as `run_model_inference`, `processRequest`, and `run_fast_model` exist. The post now aligns with current OpenTelemetry documentation for propagation configuration and OTLP/gRPC usage across the three covered languages.
