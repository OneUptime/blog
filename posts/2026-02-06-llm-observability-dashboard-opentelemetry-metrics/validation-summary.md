# Validation Summary: How to Build an LLM Observability Dashboard with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Metrics and Traces
- OpenTelemetry GenAI semantic conventions
- OpenAI Python SDK and Chat Completions API
- Streaming Chat Completions
- Prometheus / PromQL dashboard queries and alert conditions
- LLM token usage and cost estimation

## Sources Consulted
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- OpenAI Chat Completions streaming event reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events
- OpenAI Python library error types: https://developers.openai.com/api/docs/guides/error-codes#python-library-error-types
- OpenAI API pricing: https://developers.openai.com/api/docs/pricing
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry metric naming guidelines: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/
- OpenTelemetry Prometheus compatibility guidance: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus histogram and query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The OpenTelemetry counter instrument names included `.total`, which OpenTelemetry naming guidance says counters should not include. Updated the OTel names to `llm.requests`, `llm.errors`, `llm.usage.tokens`, and `llm.cost`, while keeping the Prometheus examples in the exported `_total` form.
- The OpenAI Chat Completions example used `max_tokens`, which is deprecated in favor of `max_completion_tokens` and incompatible with some newer model families. Updated the function argument and API call to `max_completion_tokens`.
- The tracing examples used `gen_ai.system`, which has been superseded by `gen_ai.provider.name` in current OpenTelemetry GenAI semantic conventions. Updated both non-streaming and streaming examples.
- The streaming example counted streamed chunks as output tokens. Updated it to request `stream_options={"include_usage": True}` and record `completion_tokens` from the final usage chunk when available.
- The streaming example assumed every chunk has a choice. Updated the loop to handle the final usage chunk, where choices may be empty.
- The model pricing examples used older model names and prices. Updated the sample pricing map, default model names, business-context examples, and illustrative cost table to current OpenAI model examples.
- The PromQL histogram percentile examples did not aggregate classic histogram buckets with the required `le` label. Updated histogram queries and alert expressions to use `histogram_quantile(..., sum by (le, model) (rate(..._bucket[5m])))`.
- Several PromQL examples relied on separate `group_by` fields rather than valid grouped PromQL. Updated request-rate, error-rate, cost, finish-reason, and alert expressions to use `sum by (...)`.

## Review Notes
- The post still uses Chat Completions for the examples. OpenAI's current API reference recommends the Responses API for new projects, but Chat Completions remains documented and the examples are valid for a Chat Completions-specific tutorial.
- Prometheus metric names can vary depending on exporter configuration, especially around unit and type suffixes. The post now states the assumption behind the PromQL names.
