# Validation Summary: How to Optimize Trace Span Count Without Losing Visibility

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry SDK sampling
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector filter processor and OTTL

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Python sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Python trace SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector transforming telemetry/filter processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Java SDK sampler Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.56.0/io/opentelemetry/sdk/trace/samplers/SamplingResult.html
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Java agent suppression documentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/

## Issues Found
- The head-based sampling section used `TraceIdRatioBased` directly and claimed all services in a distributed trace make the same decision. Updated the explanation and Python example to wrap `TraceIdRatioBased(0.1)` in `ParentBased(...)`, matching OpenTelemetry guidance for respecting propagated parent sampling decisions.
- The Java suppression example referenced a non-standard `FilteringSampler` and used `span.getName()` inside sampler logic, which is not how the Java SDK sampler API works. Replaced it with a custom `Sampler` implementation for root spans using the current `shouldSample(...)` signature and `SamplingResult` API.
- The Collector filter example used `matches`, which is not valid OTTL syntax in the filter processor. Replaced it with `IsMatch(attributes["db.statement"], "^SELECT 1$")`.
- The span limits section incorrectly said OpenTelemetry SDKs can set a maximum number of spans per trace. Corrected the text to explain that SDK `SpanLimits` cap per-span payload size, and retained the instrumentation guidance for reducing span depth by aggregating batch work into one span.
- The Go span processor example only implemented `OnEnd` and used the wrong package qualifier for SDK trace interfaces. Updated it to use `sdktrace.SpanProcessor`, `sdktrace.ReadOnlySpan`, and the required `OnStart`, `Shutdown`, and `ForceFlush` methods.

## Review Notes
- The `tail_sampling` processor is part of Collector Contrib/Kubernetes distributions, not every minimal custom Collector build. The configuration fields and policies shown are current.
- Filtering spans in the Collector can remove individual spans from otherwise retained traces, which may be appropriate for noisy health checks but can also create partial traces if overused.
