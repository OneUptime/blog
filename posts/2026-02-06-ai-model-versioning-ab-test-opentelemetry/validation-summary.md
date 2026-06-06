# Validation Summary: How to Track AI Model Versioning and A/B Test Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenAI Chat Completions API and Python SDK
- Anthropic Messages API and Python SDK
- Prometheus / PromQL histogram queries
- A/B test routing and model/prompt version telemetry

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenAI Chat Completions OpenAPI reference: https://api.openai.com/v1/chat/completions
- Anthropic Messages API examples and model ID references: https://docs.anthropic.com/
- Prometheus `histogram_quantile` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The Anthropic example used `claude-3-opus`, which is not the current Messages API model ID format shown in Anthropic's documentation. Updated the example to `claude-opus-4-20250514` and adjusted related diagrams/tables to say Claude Opus 4.
- The OpenAI examples used older `gpt-4-turbo` / `2024-01-25` identifiers. Updated the examples to `gpt-4o` with the `2024-08-06` snapshot metadata, matching the current model ID style shown in OpenAI documentation.
- The error-rate dashboard query depended on `status="error"` metrics, but the sample code only recorded successful requests. Added exception handling that increments the request counter with `status="error"`, records the exception on the span, sets span status to error, and re-raises.
- The P95 PromQL query did not aggregate classic histogram buckets by `le` and `variant`, so it would not reliably produce a per-variant percentile. Updated the query to use `sum by (variant, le) (...)` inside `histogram_quantile`.

## Review Notes
The OpenTelemetry attribute names in the post are custom attributes rather than official GenAI semantic convention attributes. That is acceptable for the tutorial's stated goal of defining a custom versioning schema, but production systems may prefer aligning stable model and provider attributes with the latest OpenTelemetry GenAI semantic conventions.
