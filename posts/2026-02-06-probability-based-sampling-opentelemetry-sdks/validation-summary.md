# Validation Summary: How to Configure Probability-Based Sampling in OpenTelemetry SDKs

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- OpenTelemetry tracing SDKs
- Probability-based trace sampling
- Parent-based trace sampling
- Python OpenTelemetry SDK
- Node.js OpenTelemetry SDK
- Java OpenTelemetry SDK
- Go OpenTelemetry SDK
- OTLP trace exporters
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry TraceState probability sampling specification: https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python sampling API/source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/sampling.html
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java ResourceAttributes Javadoc: https://javadoc.io/static/io.opentelemetry.semconv/opentelemetry-semconv/1.28.0-alpha/io/opentelemetry/semconv/ResourceAttributes.html
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go OTLP gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Go semconv v1.37.0 documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0

## Issues Found
- The post described `TraceIdRatioBased` as using one exact lower-64-bit algorithm across all SDKs. The current OpenTelemetry spec requires deterministic behavior but warns that the exact `TraceIdRatioBased` algorithm was not historically specified across SDKs. I changed the explanation to avoid promising cross-SDK algorithm identity and noted the Python SDK's low-order 64-bit behavior only as a Python example.
- The post claimed services with the same trace ID and ratio can independently arrive at the same decision across a distributed system. I narrowed this to a single SDK algorithm and emphasized the spec-recommended pattern of using `TraceIdRatioBased` as the root sampler inside `ParentBased`.
- Several resource examples used deprecated `deployment.environment`. I updated them to the current `deployment.environment.name` semantic convention.
- The Node.js example used `new Resource(...)`, while current JavaScript resource docs show `resourceFromAttributes(...)`. I updated the example accordingly.
- The Java example imported deprecated generated semantic-convention constants from `ResourceAttributes`. I replaced them with explicit `AttributeKey.stringKey(...)` attributes.
- The Go example used older semconv v1.24.0 and `semconv.DeploymentEnvironment(...)`. I updated it to semconv v1.37.0 and `semconv.DeploymentEnvironmentName(...)`.
- The custom Python sampler did not match the current `Sampler.should_sample` signature, used an off-by-one bound compared with Python's current `TraceIdRatioBased`, and did not preserve trace state. I updated the signature, bound calculation, and `SamplingResult` construction.
- The "mismatched ratios" pitfall implied downstream inconsistency even when `ParentBased` is used. I clarified that downstream services follow the propagated parent decision and that mismatched root ratios mainly create different effective sampling rates depending on where traces start.

## Review Notes
The examples are accurate as illustrative snippets, but real applications should pin compatible OpenTelemetry package versions and may prefer environment-based resource configuration (`OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES`) for deployment-specific values.
