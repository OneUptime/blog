# Validation Summary: How to Implement Safety Filters and Content Moderation with Gemini on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini API in Vertex AI
- Google Gen AI SDK for Python
- Gemini safety settings and content filters
- Python content moderation pipeline patterns

## Sources Consulted
- Google Cloud: Safety and content filters for Gemini on Vertex AI: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters
- Google Cloud: Vertex AI SDK migration guide: https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud: Generative AI on Vertex AI deprecations: https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud REST reference: SafetySetting: https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/SafetySetting
- Google Cloud REST reference: HarmBlockThreshold: https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/HarmBlockThreshold

## Issues Found
- The post used the deprecated `vertexai.generative_models` Python API. I migrated the snippets to the current `google-genai` SDK, using `genai.Client(vertexai=True, ...)`, `GenerateContentConfig`, and `client.models.generate_content(...)`, because Google states the Vertex AI SDK generative module is deprecated and scheduled for removal after June 24, 2026.
- The post said Gemini evaluates both inputs and outputs against the configurable harm categories. I corrected this to distinguish unsafe prompt rejection through non-configurable filters from configurable content filters that block model responses.
- The post described only probability levels and said Gemini blocks `MEDIUM` or `HIGH` by default. I updated this to include severity levels and note that defaults vary by model, with Gemini 2.5 Flash and later defaulting to `OFF`, so applications should set thresholds explicitly.
- The post said every response includes safety ratings. I changed this to say responses include safety ratings when safety metadata is enabled, because the `OFF` threshold disables automated blocking and returns no metadata.
- The examples used `gemini-2.0-flash` while the current official examples use `gemini-2.5-flash`. I updated model references in the code snippets to `gemini-2.5-flash`.
- The blocked-content helper used `candidate.text`, which is from the older SDK style. I changed it to return `response.text`, which matches the current Google Gen AI SDK examples.

## Review Notes
The Python snippets were parsed with `ast` to confirm syntax validity. They were not executed against Vertex AI because that would require Google Cloud credentials, a configured project, and API access.
