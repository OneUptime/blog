# Validation Summary: How to Configure OpenTelemetry Sampling for Mobile Apps to Reduce Data Volume

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and sampling
- OpenTelemetry Swift API and SDK
- OpenTelemetry Java/Kotlin API and SDK for Android
- Android `ActivityManager`
- Head-based, tail-based, probability-based, parent-based, and rate-limited sampling

## Sources Consulted
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry trace SDK specification, Sampler section: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Swift documentation: https://opentelemetry.io/docs/languages/swift/
- OpenTelemetry Swift core source for `Sampler`, `Decision`, `Samplers`, `TracerProviderBuilder`, `TraceId`, and `ResourceAttributes`: https://github.com/open-telemetry/opentelemetry-swift-core
- OpenTelemetry Java SDK `Sampler` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/trace/src/main/java/io/opentelemetry/sdk/trace/samplers/Sampler.java
- OpenTelemetry Java SDK `TraceIdRatioBasedSampler` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/trace/src/main/java/io/opentelemetry/sdk/trace/samplers/TraceIdRatioBasedSampler.java
- OpenTelemetry Java SDK `LinkData` source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk/trace/src/main/java/io/opentelemetry/sdk/trace/data/LinkData.java
- Android `ActivityManager.isLowRamDevice()` reference: https://developer.android.com/reference/android/app/ActivityManager#isLowRamDevice()

## Issues Found
- Replaced the non-existent Swift `Samplers.probability(probability:)` call with the current `Samplers.parentBased(root: Samplers.traceIdRatio(ratio:))` API.
- Corrected Swift custom samplers to return the SDK `Decision` protocol instead of a non-existent `SamplingResult` type, and added small `Decision` implementations for the examples.
- Updated Swift deterministic sampling to use `TraceId.rawLowerLong`, matching the SDK's trace-ratio sampler behavior, and handled `0.0`/`1.0` threshold edge cases.
- Added the missing `OpenTelemetrySdk` import to the user-tier Swift sampler snippet because `Sampler`, `Decision`, and `SpanData.Link` are SDK types.
- Corrected Kotlin sampler signatures to use `List<LinkData>`, matching the OpenTelemetry Java SDK `Sampler` interface.
- Replaced the invalid Android `ActivityManager()` construction with `applicationContext.getSystemService(Context.ACTIVITY_SERVICE)`.
- Replaced the invalid Java semantic-convention user ID lookup with `AttributeKey.stringKey("user.id")` in the Kotlin example.
- Updated Kotlin trace ID sampling to use the lower 64 bits of the trace ID and unsigned parsing, matching the Java SDK sampler implementation.
- Added missing Kotlin imports for `Attributes`, `Span`, `SpanKind`, `Context`, `LinkData`, and `SamplingDecision`.
- Fixed the rate-limiting sampler's time-window reset logic, which previously did not reset the counter when the second changed.
- Corrected parent-handling examples to honor both sampled and unsampled parent decisions instead of only preserving sampled parents.
- Clarified that head-based error sampling can only use error information available at span creation time; errors discovered after span completion require tail-based sampling in the Collector or backend.
- Adjusted the rate-limited sampling description because the example delegates to a fallback sampler after the limit rather than enforcing a strict hard cap.

## Review Notes
The examples were statically reviewed against official OpenTelemetry documentation and upstream SDK source. The snippets include placeholder application functions such as `createExporter()`, `getAppVersion()`, `getDeviceModel()`, `getOSVersion()`, and `MetricsManager`, so they are illustrative rather than complete standalone programs.
