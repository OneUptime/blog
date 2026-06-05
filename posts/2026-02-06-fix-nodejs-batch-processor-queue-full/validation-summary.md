# Validation Summary: How to Fix OpenTelemetry Node.js SDK Silently Dropping Spans When the Batch

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry JavaScript/Node.js SDK
- BatchSpanProcessor
- OTLP HTTP trace exporter
- OpenTelemetry diagnostic logging
- OpenTelemetry trace sampling

## Sources Consulted
- OpenTelemetry JavaScript BatchSpanProcessor API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-base.BatchSpanProcessor.html
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Published npm package source for `@opentelemetry/sdk-trace-base` 2.7.1, `@opentelemetry/sdk-trace-node` 2.7.1, `@opentelemetry/exporter-trace-otlp-http` 0.218.0, `@opentelemetry/otlp-exporter-base` 0.218.0, and `@opentelemetry/sdk-node` 0.218.0

## Issues Found
- The queue behavior said exports happen only every `scheduledDelayMillis`. In the current JavaScript SDK, the processor also starts an export when `_finishedSpans.length >= maxExportBatchSize`. Updated the explanation.
- The overflow threshold example implied the default queue overflows at roughly 2048 spans per 5 seconds. Because exports can start when `maxExportBatchSize` is reached and export duration matters, this was too simplistic. Reworded it to focus on producer rate versus drain rate.
- The diagnostic logging description and log string did not match the current SDK source. Clarified that the `WARN`-level dropped count is emitted after the queue has room again, and updated the message to `Dropped <number> spans because maxQueueSize reached`.
- The exporter error description attributed retries to the batch processor. Current OTLP exporter transport handles retryable failures, so the wording now says retryable OTLP failures are retried by the exporter.
- The memory estimate for queued spans was presented too concretely. Replaced it with a caveat that span memory depends on attributes, events, links, and resource data.
- The sampling snippet used `NodeSDK` without importing it. Added the current `@opentelemetry/sdk-node` import and used the documented Node trace SDK package for sampler imports.
- The HTTP exporter section claimed HTTP can be faster because it does not maintain HTTP/2 streams, and the example comment implied `headers: {}` enables compression. Reworded the claim and added the current `compression: 'gzip'` option.

## Review Notes
The tuning table remains a set of starting points, not guaranteed throughput guidance. Large `maxExportBatchSize` values should be tested against backend payload limits and observed exporter latency.
