# Validation Summary: How to Configure Safety Settings and Content Filtering for Gemini Models

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI
- Gemini models
- Google Gen AI SDK for Python
- Vertex AI safety settings and content filters
- Python
- Flask
- BigQuery
- GoogleSQL

## Sources Consulted
- Google Cloud Vertex AI safety and content filters: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters
- Google Cloud Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud Vertex AI Gemini 2.0 Flash model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash
- Google Cloud Vertex AI REST GenerateContentResponse reference: https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse
- Google Cloud BigQuery Python Client.insert_rows_json reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- Google Cloud BigQuery COUNTIF aggregate documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The post used the deprecated `vertexai.generative_models` module from the Vertex AI SDK. Google deprecated the generative AI module on June 24, 2025 and schedules removal for June 24, 2026, so the code examples were updated to use the current `google-genai` SDK with `genai.Client(vertexai=True, ...)`.
- Safety settings were shown as model-constructor configuration. In the current Google Gen AI SDK, the examples should pass `types.SafetySetting` values through `types.GenerateContentConfig(safety_settings=...)` on `client.models.generate_content(...)`. The snippets were updated accordingly.
- The threshold descriptions only described probability-based blocking and omitted the current `OFF` threshold. The text now notes `method="SEVERITY"`, explains that both probability and severity are evaluated in that mode, includes `OFF`, and notes that `BLOCK_NONE` is restricted and not available to every project.
- The blocked-response handler used the old SDK response shape (`candidate.finish_reason.name`, `rating.category.name`, and `rating.probability.name`). It was updated to handle current Google Gen AI response fields defensively.
- The Flask service snippet referenced `ContentFilter`, `get_safety_config`, and `safe_generate` without imports and cached model instances using the old SDK pattern. It now imports those helpers and passes per-request safety settings to the shared Gen AI client.
- The BigQuery logging example used `json.dumps(...)` without importing `json`. The missing import was added.
- The logging example used `datetime.utcnow()`, which is deprecated in modern Python. It now uses `datetime.now(timezone.utc)`.

## Review Notes
The examples are compile-valid Python snippets, but they were not executed against Vertex AI because the local environment does not have Google Cloud SDK packages installed or configured credentials. The custom regex-based filtering examples are intentionally illustrative and would need stronger validation for production PII detection.
