# Validation Summary: How to Use Quality Metrics for LLM Outputs Using OpenTelemetry Custom Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- OpenTelemetry Metrics API and OTLP metric export
- OpenAI Python SDK and Chat Completions API
- Hugging Face Transformers pipelines
- Sentence Transformers
- LLM quality evaluation and observability

## Sources Consulted
- OpenAI OpenAPI specification for `POST /v1/chat/completions`: https://api.openai.com/v1/chat/completions
- OpenAI SDKs and CLI documentation: https://developers.openai.com/api/docs/libraries
- OpenAI Developer Quickstart: https://developers.openai.com/api/docs/quickstart
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Hugging Face Transformers pipeline documentation: https://huggingface.co/docs/transformers/en/main_classes/pipelines
- Hugging Face `unitary/toxic-bert` model card: https://huggingface.co/unitary/toxic-bert
- Sentence Transformers documentation: https://sbert.net/docs/quickstart.html

## Issues Found
- The OpenAI example used the module-level `openai.chat.completions.create(...)` pattern and older model examples. Updated the code to use the current documented `OpenAI()` client pattern and changed the example model variants from `gpt-4`/`gpt-4-turbo` to current model IDs `gpt-5.4`/`gpt-5.4-mini`.
- The toxicity classifier assumed a single returned label named exactly `toxic`. `unitary/toxic-bert` is a multi-label toxicity model, so the code now requests all labels with `top_k=None` and selects the `toxic` score case-insensitively.
- The hallucination score path with context only clamped the lower bound. Negative cosine similarity could produce a value above `1.0`, contradicting the stated 0.0 to 1.0 metric range. Updated the code to clamp both bounds.

## Review Notes
- The OpenTelemetry histogram and counter usage matches current Python API patterns for recording custom metrics.
- The metric cardinality guidance is technically sound. In a production implementation, `request_id` should remain trace/log data rather than a metric attribute.
- The post's hallucination and relevance examples are intentionally simplified heuristics; the post already notes that production systems should use stronger grounding or NLI-style checks.
