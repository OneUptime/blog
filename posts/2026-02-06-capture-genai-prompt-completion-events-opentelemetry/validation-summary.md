# Validation Summary: How to Capture GenAI Prompt and Completion Events in OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry semantic conventions for Generative AI
- OpenTelemetry Python tracing SDK
- OTLP trace export
- OpenAI Python SDK and Chat Completions API
- Python PII sanitization with regular expressions
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry GenAI events semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/
- OpenTelemetry GenAI spans semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry OpenAI client semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/openai/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Span API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenAI Chat Completions OpenAPI specification: https://api.openai.com/v1/chat/completions

## Issues Found
- The post used older GenAI semantic convention names: `gen_ai.system`, `gen_ai.prompt`, and `gen_ai.completion`. Updated the table and code to current names including `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.input.messages`, `gen_ai.output.messages`, and `gen_ai.client.inference.operation.details`.
- The OpenAI example used the older module-level `openai.chat.completions.create` style. Updated the snippets to use `from openai import OpenAI` and `client = OpenAI()`, matching current OpenAI Python SDK documentation.
- The examples used the deprecated OpenAI `max_tokens` request parameter. Updated the API call parameter to `max_completion_tokens` while preserving the OpenTelemetry `gen_ai.request.max_tokens` semantic attribute.
- The example span name and kind did not match current OpenTelemetry GenAI guidance. Updated spans to use the recommended `{operation} {model}` pattern and `SpanKind.CLIENT`.
- The sanitization example referenced `tracer` and `openai` without defining them in that standalone snippet. Added the required imports and client/tracer setup.
- The sanitization example could pass `None` to the sanitizer if a response had no text content. Updated completion extraction to fall back to an empty string.

## Review Notes
OpenTelemetry GenAI semantic conventions are still marked as development, and the post now reflects the current convention names as of this review. The OpenAI Chat Completions API remains supported, but OpenAI's current API reference recommends the Responses API for new projects.
