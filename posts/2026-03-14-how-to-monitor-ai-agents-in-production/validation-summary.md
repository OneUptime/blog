# Validation Summary: How to Monitor AI Agents in Production with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry traces, metrics, logs, OTLP, and Collector configuration
- OpenTelemetry Python SDK and JavaScript SDK packages
- OpenAI Chat Completions API and Python SDK
- Python logging
- AI agent observability patterns for LLM calls, tool calls, tokens, cost, and latency

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Generative AI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenAI Chat Completions API reference: https://platform.openai.com/docs/api-reference/chat/create-chat-completion
- OpenAI Python SDK documentation: https://github.com/openai/openai-python

## Issues Found
- The OpenAI Python snippet used `openai.chat.completions.create` without showing the current official `OpenAI()` client setup. Updated the snippet to import `OpenAI`, create `client = OpenAI()`, and call `client.chat.completions.create(...)`.
- The tool error handling snippet used `trace.Status` and `trace.StatusCode`, while the OpenTelemetry Python docs show importing `Status` and `StatusCode` from `opentelemetry.trace`. Added the documented imports and updated the call to `span.set_status(Status(StatusCode.ERROR, str(e)))`.
- The Python install command did not include the `openai` package even though the LLM example uses the OpenAI Python SDK. Added `openai` to the install command.
- The initialization block configured traces but the later metric examples rely on an initialized OpenTelemetry `MeterProvider`. Added a minimal OTLP metric exporter and `PeriodicExportingMetricReader` setup.
- The tool call snippet used `json.dumps(...)` without importing `json`. Added the standard-library import to the snippet.
- The token usage section said to track per-agent-run values as histograms, but the code used counters. Changed the token and cost instruments to histograms and changed `.add(...)` calls to `.record(...)`.
- The structured logging snippet imported OpenTelemetry logging SDK classes but did not connect Python logging to an OpenTelemetry log provider or handler. Added the documented `LoggerProvider`, `BatchLogRecordProcessor`, `OTLPLogExporter`, `set_logger_provider`, and `LoggingHandler` setup so log records can be exported through OpenTelemetry.
- The Collector `otlphttp` exporter example used an endpoint ending in `/v1`. The OTLP/HTTP exporter treats `endpoint` as a base URL and appends signal-specific paths, so the placeholder was changed to `https://your-observability-platform`.

## Review Notes
- The post uses custom attribute names such as `llm.tokens_input` and `tool.name`. That is acceptable for application instrumentation, but OpenTelemetry now has development-status Generative AI semantic conventions with standardized `gen_ai.*` attributes that could be adopted in a future update for better backend interoperability.
- OpenAI documentation currently recommends trying the Responses API for the latest platform features, while also documenting Chat Completions as supported. The post's Chat Completions example remains technically valid.
- The Python logging API is still documented by OpenTelemetry as under development, so teams should pin OpenTelemetry package versions and re-check log API imports during upgrades.
