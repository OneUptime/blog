# Validation Summary: How to Fix Baggage Values Not Propagating Across Service Boundaries Because

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context
- W3C Baggage
- OpenTelemetry Python SDK/API
- OpenTelemetry Go SDK/API
- OpenTelemetry Java SDK/API
- OpenTelemetry JavaScript Node SDK
- OpenTelemetry SDK environment variables
- OpenTelemetry Collector

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry SDK general configuration documentation for `OTEL_PROPAGATORS`: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- Go OpenTelemetry propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Java SDK TextMapPropagator documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript `CompositePropagator` API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_core.CompositePropagator.html
- OpenTelemetry JavaScript `W3CBaggagePropagator` API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_core.W3CBaggagePropagator.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- W3C Baggage Recommendation: https://www.w3.org/TR/baggage/

## Issues Found
- The Python propagator snippet imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, but current official examples use `opentelemetry.trace.propagation.tracecontext`. Updated the import.
- The Python snippet imported `B3MultiFormat` even though the example configures W3C Trace Context and W3C Baggage only. Removed the unused import to avoid implying B3 is required.
- The Java snippet used `OpenTelemetrySdk.builder()` without importing `OpenTelemetrySdk`. Added the missing import.
- The Node.js snippet configured `NodeSDK` but did not call `sdk.start()`. Added `sdk.start()` so the configuration is actually applied.
- The Python baggage usage example created a new context with baggage but did not make it active or pass it to injection. Added `context.attach(ctx)` / `context.detach(token)` around the downstream request placeholder so auto-instrumentation can inject the baggage.
- The environment-variable section implied explicit configuration is always required. Updated it to note that many SDK configurations default to `tracecontext,baggage`, while explicit configuration is useful when the deployment has overridden the propagator list.
- The Collector caveat incorrectly said the Collector passes HTTP headers through transparently. Reworded it to clarify that the Collector is not normally in the service-to-service request path and that SDKs handle baggage propagation.

## Review Notes
The core explanation is accurate: W3C Trace Context and W3C Baggage are separate propagators, and a custom propagator list that omits baggage will propagate trace IDs but not the `baggage` header. Future revisions could add a note that baggage may be unintentionally sent to downstream third-party services unless applications clear or filter it before those calls.
