# Validation Summary: How to Create Latency Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- TypeScript
- Node.js
- OpenAI Chat Completions API and OpenAI Node SDK
- OpenTelemetry JavaScript metrics SDK
- OTLP HTTP metrics exporter
- Prometheus / PromQL-style metric queries
- LLM latency monitoring concepts: TTFT, ITL, histograms, percentiles, SLOs, alerting

## Sources Consulted
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model.md
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JS API docs for `@opentelemetry/resources`: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS `MeterProviderOptions` API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-metrics.MeterProviderOptions.html
- OpenTelemetry metrics API specification for histogram advisory bucket boundaries: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry SDK configuration for OTLP exporters: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Prometheus histogram practices: https://prometheus.io/docs/practices/histograms/
- Prometheus metric types tutorial: https://prometheus.io/docs/tutorials/understanding_metric_types/
- OneUptime telemetry docs for OTLP endpoint and `x-oneuptime-token`: https://oneuptime.com/docs/en/telemetry/serilog

## Issues Found
- The dependency install command omitted direct dependencies used by the code. Added `@opentelemetry/resources` and `@opentelemetry/semantic-conventions`.
- The OpenTelemetry resource example used `new Resource(...)`, which is not exported by current `@opentelemetry/resources` 2.x. Replaced it with `resourceFromAttributes(...)` and current semantic convention constants.
- The code defined `llm.tokens.rate` as an observable gauge without registering a callback, so it would not emit useful values. Removed the unused gauge and kept token throughput based on the token counter rate.
- The OpenAI examples used deprecated `max_tokens` for Chat Completions. Replaced it with `max_completion_tokens`.
- The default/sample model was `gpt-4`. Updated it to `gpt-4o`, a current model ID shown in the Chat Completions reference, without migrating the whole post to the Responses API.
- Streaming TTFT was recorded before final usage data arrived, causing the prompt-token bucket to be inaccurate for streaming requests. Moved TTFT recording until after the stream completes while preserving the original first-token timestamp.
- The percentile tracker exposed only TTFT percentile gauges, while the dashboard and alerts referenced `llm.itl.p95`. Added an ITL P95 observable gauge and callback.
- Several PromQL-style queries were invalid because `rate()` had no range vector or because `histogram_quantile()` was applied directly to a histogram metric. Replaced them with valid range-vector and bucket-based expressions.
- The "Latency by Model" table attempted to average histogram metric names directly. Replaced those expressions with sum/count rate calculations.
- The alert evaluator accepted a `duration` field but triggered immediately. Added pending-alert tracking and duration parsing so alerts fire only after the configured condition duration.

## Review Notes
- The extracted TypeScript snippets were compiled successfully in a temporary project using current `openai`, OpenTelemetry, TypeScript, and Node type packages.
- The PromQL metric names may still need adjustment for a specific exporter/backend because OpenTelemetry-to-Prometheus name normalization can append unit suffixes depending on configuration.
