# Validation Summary: How to Instrument OpenAI and Anthropic API Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and OTLP export
- OpenTelemetry GenAI semantic conventions
- OpenAI Python SDK and Chat Completions API
- Anthropic Python SDK and Messages API
- Python

## Sources Consulted
- OpenTelemetry GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- OpenTelemetry GenAI client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenAI Chat Completions OpenAPI/API reference: https://api.openai.com/v1/chat/completions and https://platform.openai.com/docs/api-reference/chat/create
- OpenAI Python SDK request ID and error handling docs: https://github.com/openai/openai-python
- Anthropic Python SDK docs: https://platform.claude.com/docs/en/api/sdks/python
- Anthropic streaming Messages docs: https://platform.claude.com/docs/en/build-with-claude/streaming
- Anthropic model deprecations: https://platform.claude.com/docs/en/about-claude/model-deprecations
- Anthropic Python SDK streaming implementation: https://github.com/anthropics/anthropic-sdk-python
- OneUptime OTLP endpoint examples: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post used `gen_ai.system`, which is not the current OpenTelemetry GenAI provider attribute. Updated examples and the closing summary to use `gen_ai.provider.name`.
- The post omitted the required `gen_ai.operation.name` attribute for GenAI model spans. Added `gen_ai.operation.name = "chat"` to each span example.
- The OpenAI example only looked for `max_tokens` when setting `gen_ai.request.max_tokens`. OpenAI Chat Completions now documents `max_completion_tokens` as the non-deprecated request limit parameter, with `max_tokens` deprecated. Updated the instrumentation to prefer `max_completion_tokens` while still falling back to `max_tokens`.
- The Anthropic examples used `claude-sonnet-4-20250514`, which Anthropic lists as deprecated with a June 15, 2026 retirement date. Updated the examples to the documented replacement, `claude-sonnet-4-6`.
- The unified Anthropic wrapper passed `max_tokens` explicitly and also expanded `**kwargs`, which raises `TypeError` if callers pass `max_tokens`. Reworked that snippet to copy kwargs and set a default `max_tokens` only when absent.
- The environment configuration used `OTEL_GENAI_LOG_CONTENT`, which is not a standard OpenTelemetry environment variable and is not read by the manual instrumentation in the post. Replaced it with the documented `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` setting for instrumentations that require explicit opt-in to the latest GenAI semantic conventions.

## Review Notes
- The GenAI semantic conventions are still marked Development by OpenTelemetry, so future convention changes may require another pass.
- The post intentionally uses manual instrumentation rather than automatic LLM instrumentation libraries; that is technically valid for the tutorial's scope.
