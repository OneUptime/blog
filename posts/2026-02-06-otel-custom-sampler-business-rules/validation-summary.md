# Validation Summary: How to Build a Custom Sampler in OpenTelemetry That Samples Based

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing SDK
- OpenTelemetry sampling
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- Custom sampler implementations

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Java SDK Sampler Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.56.0/io/opentelemetry/sdk/trace/samplers/Sampler.html
- OpenTelemetry Java SDK SamplingResult Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.56.0/io/opentelemetry/sdk/trace/samplers/SamplingResult.html

## Issues Found
- The introduction described all built-in samplers as probability-based and used the non-current name `TraceIdRatio`. I changed this to describe fixed, probability-based, and parent-based decisions and used `TraceIdRatioBased`, matching OpenTelemetry terminology.
- The `RECORD_ONLY` description said the span is recorded "for metrics." I changed it to state that the span is recorded and passed to span processors but not exported, matching the OpenTelemetry trace SDK behavior.
- The Python sampler docstring claimed that error spans are always sampled, but the sampler did not implement an error rule and head samplers generally only see span creation-time data. I removed that unsupported bullet.
- The Python custom sampler method omitted the current `trace_state` parameter from the OpenTelemetry Python `Sampler.should_sample` API. I added `trace_state=None` and passed it through to `SamplingResult`.
- The parent-based Python setup imported `ParentBasedTraceIdRatio` but did not use it. I removed the unused import.
- The Java sampler used `LinkData` without importing it. I added `io.opentelemetry.sdk.trace.data.LinkData`.
- The Java sampler switched directly on `userTier`, which can be `null` when the `user.tier` attribute is absent. I added a null guard before the switch.

## Review Notes
The deterministic custom hashing examples are acceptable for illustrating a business-rule sampler, but production code should also consider preserving or updating trace state consistently with the sampler strategy and should document the minimum Java version if using switch expressions and `Set.of`.
