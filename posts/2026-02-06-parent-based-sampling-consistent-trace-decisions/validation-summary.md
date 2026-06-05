# Validation Summary: How to Use Parent-Based Sampling for Consistent Trace Decisions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry sampling
- Parent-based sampling
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector
- OTLP exporter configuration
- W3C Trace Context and B3 propagation

## Sources Consulted
- OpenTelemetry Python sampling API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python propagate API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java Sampler Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.45.0/io/opentelemetry/sdk/trace/samplers/Sampler.html
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry B3 propagator source and README: https://github.com/open-telemetry/opentelemetry-python/tree/main/propagator/opentelemetry-propagator-b3

## Issues Found
- The Java section said the example used the `ParentBased` builder, but the code uses `Sampler.parentBased(...)`. Updated the text to distinguish the common `Sampler.parentBased()` API from the configurable `Sampler.parentBasedBuilder()` API.
- The Java explanation only mentioned remote parents. Updated it to say parent-based sampling follows a parent from the current or incoming context.
- The advanced Python section said there were four scenarios while listing five delegate cases. Corrected this to five scenarios.
- The Collector configuration comment claimed the `probabilistic_sampler` respects parent decisions by default. The Collector probabilistic sampler makes deterministic per-item decisions based on trace ID and configuration; it is not a replacement for SDK parent-based sampling. Updated the comment and explanatory paragraph.
- The Python propagation example imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, which is not the documented import path. Changed it to `opentelemetry.trace.propagation.tracecontext`.

## Review Notes
The examples use `TraceIdRatioBased` through parent-based samplers, which remains supported in SDK APIs, though the OpenTelemetry Trace SDK specification now marks `TraceIdRatioBased` as deprecated in favor of newer probability sampling work and says SDKs should not remove or change its behavior before January 1, 2027. Future updates could mention that version-specific caveat, but the current examples are still valid for common SDK usage.
