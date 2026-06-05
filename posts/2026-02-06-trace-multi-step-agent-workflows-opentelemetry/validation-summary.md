# Validation Summary: How to Trace Multi-Step Agent Workflows with OpenTelemetry Sessions and Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OTLP exporters
- Python
- AI agent and LLM tool-call workflows
- Distributed trace context propagation

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry context specification: https://opentelemetry.io/docs/specs/otel/context/
- OpenTelemetry session semantic attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/session/
- OpenTelemetry GenAI span semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The exporter example used the gRPC OTLP exporter with an HTTP-style OneUptime endpoint. Changed it to the OTLP HTTP trace exporter with the signal-specific `/v1/traces` endpoint and an `x-oneuptime-token` header.
- The post said OpenTelemetry has no built-in session concept. Clarified that sessions are not first-class trace objects, while `session.id` is now a standard semantic attribute.
- The examples only used a custom `agent.session_id` attribute. Added `session.id` alongside it so the examples align with current OpenTelemetry semantic conventions while preserving the article's custom query examples.
- `SpanKind` was imported but unused, and `AgentMaxStepsError` was referenced without definition. Removed the unused import and added a minimal custom exception.
- Tool-call messages were appended in the wrong order for chat APIs that require the assistant tool-call message before corresponding tool result messages. Moved `llm_response.to_message()` before appending tool results.
- Tool arguments were passed with `**tool_args` even though many LLM tool-call APIs return arguments as a JSON string. Added JSON decoding when arguments are strings.
- Tool lists were serialized with `str(...)`. Changed these to string arrays, which are valid OpenTelemetry attribute values.
- Parallel tool-call results were keyed by tool name, which would overwrite results when the same tool was called more than once. Changed the result map to use `tool_call.id`.

## Review Notes
The article intentionally uses custom `agent.*` attributes for readability and querying. That is technically valid, but production instrumentation should track the evolving OpenTelemetry GenAI semantic conventions and use standard attributes such as `gen_ai.conversation.id` where applicable.
