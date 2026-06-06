# Validation Summary: How to Configure Always-On Sampling for Critical Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and sampling
- OpenTelemetry SDK configuration for Python, Node.js, Java, and Go
- OpenTelemetry Collector tail sampling processor
- OTLP exporters
- Batch span processing and span limits

## Sources Consulted
- OpenTelemetry Python sampling API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript sampling docs: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry Go sampling docs: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Java BatchSpanProcessorBuilder Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.26.0/io/opentelemetry/sdk/trace/export/BatchSpanProcessorBuilder.html
- OpenTelemetry tracing SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/entities/deployment/

## Issues Found
- The post used the older `deployment.environment` resource attribute in multiple snippets. Updated examples to use the current `deployment.environment.name` semantic convention.
- The Node.js example used `new Resource(...)`; current OpenTelemetry JavaScript resource docs show `resourceFromAttributes(...)`. Updated the import and SDK configuration accordingly.
- The Java example imported deprecated semantic convention constants. Replaced them with explicit `AttributeKey.stringKey(...)` resource attributes to avoid deprecated API usage.
- The Go example used an older semantic convention package while discussing current resource attributes. Updated the semconv import to `v1.36.0` and used `semconv.DeploymentEnvironmentName(...)`.
- The custom Python sampler hand-implemented ratio sampling and did not preserve parent tracestate. Replaced the custom probability logic with `TraceIdRatioBased` and passed the parent tracestate into `SamplingResult`.
- The SDK Python comment said no traces are dropped. Narrowed it to the sampler behavior because later queues, processors, exporters, or Collectors can still drop spans.
- The environment-variable section implied changing sampling without redeployment. Adjusted the wording to say it can be done without application code changes.
- The Collector section described tail sampling as a filter processor. Corrected it to the tail sampling processor.

## Review Notes
- The Collector tail sampling example is structurally valid, but production deployments should ensure all spans for the same trace reach the same tail-sampling Collector instance, as required by the processor documentation.
- The `sampling.strategy` attribute in the custom sampler is only added to sampled spans; dropped spans are not exported and therefore cannot carry that attribute in the backend.
