# Validation Summary: How to Redact Sensitive User Prompts in GenAI OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry GenAI semantic conventions
- OpenTelemetry Collector transform processor and OTTL
- Python OpenTelemetry SDK
- OpenAI Python SDK / Chat Completions API
- Microsoft Presidio Analyzer and Anonymizer
- Regex-based PII redaction

## Sources Consulted
- OpenTelemetry GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- OpenTelemetry GenAI spans: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/
- OpenTelemetry GenAI events: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/
- OpenTelemetry Collector transforming telemetry guide: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Python SDK trace API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenAI Chat Completions API reference: https://api.openai.com/v1/chat/completions
- Microsoft Presidio Analyzer documentation: https://microsoft.github.io/presidio/analyzer/
- Microsoft Presidio Anonymizer documentation: https://microsoft.github.io/presidio/anonymizer/

## Issues Found
- The post used older/non-current GenAI span attributes `gen_ai.prompt`, `gen_ai.completion`, and `gen_ai.system`. Updated the article and code examples to use current GenAI convention names such as `gen_ai.input.messages`, `gen_ai.output.messages`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.usage.input_tokens`, and `gen_ai.usage.output_tokens`.
- The OpenAI Python snippet used module-level `openai.chat.completions.create`. Updated it to the current documented `OpenAI()` client style.
- The exporter wrapper example called an undefined `_create_redacted_span()` helper, so it would not run. Replaced it with a span-like wrapper that delegates to the original `ReadableSpan` while exposing redacted attributes.
- The SpanProcessor skeleton claimed to redact spans but did not mutate or export redacted data. Reworded the snippet so it accurately presents the processor as a hook and points readers toward export-time redaction.
- The Collector transform example used old GenAI attribute names. Updated the OTTL statements to redact `span.attributes["gen_ai.input.messages"]` and `span.attributes["gen_ai.output.messages"]`, and added `error_mode: ignore` to avoid pipeline errors when attributes are absent.
- The email regex used `[A-Z|a-z]`, which accidentally includes `|` as a valid character. Corrected it to `[A-Za-z]` in both Python and Collector examples.

## Review Notes
The GenAI semantic conventions are still marked development/experimental, and OpenTelemetry documents a migration/opt-in path for newer GenAI conventions. Implementations should verify the exact convention version emitted by their instrumentation before deploying redaction rules.
