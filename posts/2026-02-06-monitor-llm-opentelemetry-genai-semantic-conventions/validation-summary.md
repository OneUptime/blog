# Validation Summary: How to Monitor LLM Applications with OpenTelemetry GenAI Semantic Conventions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry OTLP exporter
- OpenTelemetry GenAI tracing and metrics
- OpenAI Python SDK
- OpenAI Chat Completions API
- OpenAI Embeddings API
- Python

## Sources Consulted
- OpenTelemetry GenAI span semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry GenAI event semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/
- OpenTelemetry GenAI metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenAI Chat Completions API OpenAPI spec: https://api.openai.com/v1/chat/completions
- OpenAI Embeddings API OpenAPI spec: https://api.openai.com/v1/embeddings
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- PyPI package page for opentelemetry-semantic-conventions: https://pypi.org/project/opentelemetry-semantic-conventions/

## Issues Found
- The post used the outdated `gen_ai.system` attribute. Replaced it with the current `gen_ai.provider.name` attribute and added required `gen_ai.operation.name` attributes.
- The span names used `gen_ai.chat` and `gen_ai.embeddings`, which do not match the current recommended GenAI span naming pattern. Updated examples to use `chat {model}` and `embeddings {model}` with `trace.SpanKind.CLIENT`.
- The OpenAI Chat Completions example used the deprecated `max_tokens` request parameter. Updated the API call to use `max_completion_tokens` while keeping the OpenTelemetry `gen_ai.request.max_tokens` semantic attribute.
- The error handling example did not populate `error.type`, which is conditionally required by the GenAI span conventions when an operation ends in an error. Added `error.type` with the exception class name.
- The prompt/completion content example used obsolete event names and attributes (`gen_ai.content.prompt`, `gen_ai.prompt`, `gen_ai.content.completion`, `gen_ai.completion`). Updated it to use opt-in `gen_ai.input.messages` and `gen_ai.output.messages` attributes with JSON-encoded message content.
- The metrics example used a non-standard `gen_ai.client.operation.count` metric name. Renamed it to a custom `llm.client.operation.count` counter to avoid implying it is an OpenTelemetry GenAI semantic convention metric.
- The token usage metric recorded combined input and output tokens without the required `gen_ai.token.type` attribute. Updated it to record input and output token counts separately with `gen_ai.token.type` set to `input` and `output`, and changed the unit to `{token}`.
- The alerting section referred to `gen_ai.chat` spans. Updated it to filter on spans with `gen_ai.operation.name` set to `chat`.
- The wrap-up described the covered attributes as stable enough to build on. Updated the wording to acknowledge the current experimental GenAI stability opt-in mechanism.

## Review Notes
The GenAI conventions are still marked as development in the OpenTelemetry specification, and instrumentation libraries may continue emitting older conventions unless configured to opt in to the latest experimental GenAI conventions. The examples are manually instrumented and syntactically valid, but production code should also configure authentication headers for the selected OTLP backend, such as OneUptime's `x-oneuptime-token` header.
