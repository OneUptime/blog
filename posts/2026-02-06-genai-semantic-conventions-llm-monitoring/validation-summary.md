# Validation Summary: How to Use GenAI Semantic Conventions for LLM Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry GenAI semantic conventions
- OpenAI Chat Completions API
- LLM monitoring, token usage, latency, streaming, and cost estimation

## Sources Consulted
- OpenTelemetry GenAI spans specification: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry GenAI metrics specification: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/
- OpenTelemetry GenAI events specification: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/
- OpenTelemetry GenAI attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/
- OpenTelemetry OpenAI client semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/openai/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenAI Chat Completions API reference: https://api.openai.com/v1/chat/completions
- OpenAI API pricing page: https://openai.com/api/pricing/

## Issues Found
- The post used the deprecated `gen_ai.system` attribute. Updated examples and text to use `gen_ai.provider.name`, which is the current GenAI provider attribute.
- The prompt/completion content example used outdated event and attribute names such as `gen_ai.content.prompt`, `gen_ai.prompt`, and `gen_ai.completion`. Updated the example to use `gen_ai.input.messages`, `gen_ai.output.messages`, and `gen_ai.client.inference.operation.details`.
- The content capture environment variable was listed as `OTEL_GENAI_CAPTURE_CONTENT`. Updated it to `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT`, matching the GenAI instrumentation pattern documented by OpenTelemetry.
- The GenAI token usage metric was implemented as a counter. Updated it to a histogram because `gen_ai.client.token.usage` is specified as a Histogram.
- The OpenAI Chat Completions example used the deprecated `max_tokens` request parameter. Updated the API call to use `max_completion_tokens` while retaining the OpenTelemetry semantic attribute `gen_ai.request.max_tokens`.
- The Python tracing examples referenced `trace.StatusCode` without importing the Python API status classes. Updated examples to import `Status` and `StatusCode` from `opentelemetry.trace`.
- The streaming example used `openai.OpenAI()` without importing `openai`. Added the missing import.
- The conclusion described the covered GenAI attributes as stable. Updated the wording because the OpenTelemetry GenAI conventions are still marked Development.

## Review Notes
The Python code blocks were parsed with Python AST after edits and all six snippets are syntactically valid. Several examples remain illustrative and include placeholders such as `response`, `token_count`, `embeddings`, and `call_openai_api`, which is acceptable for the guide's existing style. Pricing examples are still approximate and should be refreshed against provider pricing pages before use in production cost calculations.
