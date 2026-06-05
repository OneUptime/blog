# Validation Summary: How to Trace AI Agent Execution Flows Using OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP trace exporting
- OpenTelemetry GenAI semantic conventions
- OpenAI Python SDK
- OpenAI Chat Completions function/tool calling
- OpenAI embeddings
- Python
- OneUptime telemetry ingestion

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OneUptime host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector
- OpenAI API tools guide: https://developers.openai.com/api/docs/guides/tools
- OpenAI Chat Completions OpenAPI specification: https://api.openai.com/v1/chat/completions
- OpenAI Embeddings API reference: https://developers.openai.com/api/reference/resources/embeddings/methods/create

## Issues Found
- The setup code imported the OTLP gRPC trace exporter while using a OneUptime OTLP/HTTP endpoint path. Changed the import to `opentelemetry.exporter.otlp.proto.http.trace_exporter.OTLPSpanExporter`, used the trace-specific endpoint `https://oneuptime.com/otlp/v1/traces`, and added the required `x-oneuptime-token` header.
- The tool-call loop appended the OpenAI SDK response message object directly back into `messages`. Changed this to append a request-compatible assistant message dictionary with `role`, `content`, and serialized `tool_calls`, matching the Chat Completions request shape.
- The final response handling sliced `choice.message.content` without guarding against `None`. Changed it to default to an empty string before recording and returning it.
- The exception path used `trace.StatusCode.ERROR` directly. Changed it to import and use `Status(StatusCode.ERROR, str(e))`, matching the OpenTelemetry Python documentation's status pattern.

## Review Notes
- The GenAI semantic convention attributes used in the post, including `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, and `gen_ai.response.finish_reasons`, are technically correct but the OpenTelemetry GenAI semantic conventions are still marked Development.
- The examples are illustrative snippets and depend on application-specific functions such as `run_research`, `run_analysis`, and the vector store implementation.
- All Python code blocks were checked with `python3` syntax compilation after the edits.
