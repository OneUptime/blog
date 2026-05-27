# Validation Summary: Observability for AI Agents: Why Your LLM Apps Are Flying Blind

## Status
validated

## Post Type
Technical guide / opinion piece with implementation guidance

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python tracing API
- OpenTelemetry GenAI semantic conventions
- AI agents and LLM application observability
- Distributed tracing, metrics, alerting, RAG, and token usage tracking

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Semantic conventions for generative client AI spans: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry Semantic conventions for GenAI agent and framework spans: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/
- OpenTelemetry GenAI attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/
- OpenTelemetry Semantic conventions for generative AI metrics: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/

## Issues Found
- The Python span example used non-standard `llm.*` attribute names for model and token data. Updated the example to use current OpenTelemetry GenAI semantic convention attributes: `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, and `gen_ai.usage.output_tokens`.
- The Python span example used `llm.tokens.cost_usd` for cost. OpenTelemetry GenAI semantic conventions do not define a cost attribute, so this was changed to the application-specific `app.llm.cost_usd` namespace to avoid implying it is an official semantic convention.
- The OpenTelemetry Path section referenced `gen_ai.system`, which is now deprecated in the OpenTelemetry GenAI attribute registry and replaced by `gen_ai.provider.name`. Updated the bullet to use `gen_ai.provider.name`.

## Review Notes
The OpenTelemetry GenAI semantic conventions are still marked as Development in the official documentation, so future reviews should re-check attribute names and stability guidance.
