# Validation Summary: How to Track Token Usage, Prompt Costs, and Model Latency with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry metrics and traces
- OpenTelemetry GenAI semantic conventions
- OTLP exporters
- OpenAI Python SDK and Chat Completions API
- Anthropic Claude model pricing
- Prometheus / PromQL-style dashboard queries
- Python

## Sources Consulted
- OpenTelemetry GenAI metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/
- OpenTelemetry GenAI span semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenAI Chat Completions API reference / OpenAPI spec: https://api.openai.com/v1/chat/completions
- OpenAI latest model guidance: https://developers.openai.com/api/docs/guides/latest-model.md
- OpenAI API pricing: https://openai.com/api/pricing/
- Anthropic Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic model IDs and versions: https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions
- Anthropic models overview: https://platform.claude.com/docs/en/docs/about-claude/models/all-models

## Issues Found
- The original metric names used `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, and `gen_ai.latency` as custom histograms. Updated the examples to use the current OpenTelemetry GenAI client metric names `gen_ai.client.token.usage`, `gen_ai.client.operation.duration`, and `gen_ai.client.operation.time_to_first_chunk`, with token type recorded as `gen_ai.token.type`.
- The original latency histogram recorded milliseconds while the current GenAI duration metric uses seconds. Updated the metric recordings and units to seconds while keeping millisecond values in return payloads and span attributes for readability.
- The original examples used `gen_ai.system`; current GenAI conventions use `gen_ai.provider.name`. Updated metric labels and span attributes accordingly.
- The pricing table included outdated or deprecated model IDs and prices, including older Claude 4 snapshot IDs and Claude 3.5 Haiku pricing. Updated the table to current June 2026 OpenAI and Anthropic examples, including GPT-5.5, GPT-5.4, Claude Sonnet 4.6, Claude Haiku 4.5, and Claude Opus 4.7.
- The budget tracker was defined but not connected to successful LLM calls. Added a guarded call to `budget.record_cost(cost)` after cost calculation so the cumulative spend example works when the budget tracker is initialized.
- The streaming TTFT example recorded TTFT into the general latency metric in milliseconds. Updated it to record seconds into `gen_ai.client.operation.time_to_first_chunk` and to emit token usage metrics from the final streaming usage chunk.
- The latency breakdown diagram implied network latency could be measured as TTFT minus inference from the client side. Changed the diagram to clarify that network and queue components are not directly measurable from the client alone.
- Several PromQL examples used incorrect histogram query patterns or labels that were not emitted by the snippets. Updated daily cost to use `increase`, corrected histogram quantile aggregation with `sum by (le, gen_ai_request_model)`, computed average tokens per request from token usage and request counters, and replaced the cost-per-user query with cost-by-feature because user ID is only a span attribute in the examples.

## Review Notes
- The OpenTelemetry GenAI semantic conventions are still marked Development, so names may continue to evolve. The post now matches the current documented conventions as of 2026-06-05.
- The OpenAI Chat Completions examples remain valid, though OpenAI currently recommends the Responses API for new reasoning, tool-calling, and multi-turn use cases.
- The pricing table is intentionally configuration and should be refreshed whenever provider pricing changes.
