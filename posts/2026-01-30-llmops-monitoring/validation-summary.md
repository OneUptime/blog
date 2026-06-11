# Validation Summary: How to Implement LLM Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Langfuse Python SDK
- Helicone OpenAI proxy and REST APIs
- OpenAI Python SDK and Chat Completions API
- OpenTelemetry Python SDK and OTLP exporters
- Prometheus alerting rules
- Alertmanager-style routing configuration
- SQL dashboard queries
- LLM-as-judge quality evaluation

## Sources Consulted
- OpenAI Chat Completions API reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- OpenAI Python SDK reference, including raw response headers: https://developers.openai.com/api/reference/python
- Langfuse SDK instrumentation docs: https://langfuse.com/docs/observability/sdk/instrumentation
- Langfuse OpenAI Python integration docs: https://langfuse.com/integrations/model-providers/openai-py
- Langfuse scores via SDK docs: https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk
- Helicone OpenAI Python integration docs: https://docs.helicone.ai/integrations/openai/python
- Helicone authentication docs: https://docs.helicone.ai/helicone-headers/helicone-auth
- Helicone feedback and request ID docs: https://docs.helicone.ai/guides/cookbooks/predefining-request-id
- Helicone request API docs: https://docs.helicone.ai/rest/request/get-v1request
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/

## Issues Found
- The Langfuse examples used older `langfuse.decorators` / `langfuse_context` imports and a vanilla OpenAI client while claiming automatic OpenAI instrumentation. Updated them to current `langfuse` imports, `get_client()`, `propagate_attributes()`, and `langfuse.openai.OpenAI`.
- The Langfuse scoring example called `generate_response()` with the wrong signature and used the older `langfuse.score(...)` pattern. Updated the signature and scoring calls to `score_current_trace(...)` with numeric score types.
- The OpenAI examples used `max_tokens` in a Chat Completions call. Updated that call to `max_completion_tokens`, which is the current non-deprecated parameter.
- The Helicone request ID example accessed `response._response.headers`, a private SDK detail. Updated it to use `client.chat.completions.with_raw_response.create(...)`, `raw_response.headers`, and `raw_response.parse()`.
- The Helicone feedback example described a 1-5 rating, but the documented request feedback API uses boolean positive/negative feedback. Updated the type, docstring, payload usage, and example call.
- The custom OpenTelemetry example hard-coded an undocumented OneUptime OTLP gRPC endpoint. Updated it to use the documented OneUptime OTLP environment variables and HTTP OTLP exporters.
- The pricing table was presented as token pricing, which can become stale. Renamed it to example pricing and added a note to replace values with current provider rates.
- The quality evaluator described `temperature=0` as deterministic. Updated the comment to "More consistent evaluation" to avoid overstating determinism.

## Review Notes
The Python code fences were syntax-checked locally and all nine compiled. Some snippets still depend on credentials, network access, and placeholder application functions, so they are examples rather than standalone runnable programs.
