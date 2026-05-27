# Validation Summary: How to Use Adaptive Rubrics for Automated LLM Output Evaluation on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini API on Vertex AI
- Google Gen AI SDK for Python
- Python
- JSON output generation
- LLM-as-a-judge evaluation rubrics

## Sources Consulted
- Google Cloud Vertex AI SDK for Python reference deprecation warning: https://docs.cloud.google.com/python/docs/reference/vertexai/latest
- Gemini API in Vertex AI quickstart: https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal
- Google Gen AI SDK Python reference: https://googleapis.github.io/python-genai/genai.html
- Vertex AI system instructions documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instructions
- Vertex AI content generation parameters documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters

## Issues Found
- The post used `vertexai.generative_models.GenerativeModel` and `GenerationConfig`. Google Cloud documentation marks the Vertex AI SDK generative AI modules, including `vertexai.generative_models`, as deprecated as of June 24, 2025 and scheduled for removal on June 24, 2026. I updated the examples to use the current `google-genai` SDK with `genai.Client`, `HttpOptions`, `client.models.generate_content`, and `GenerateContentConfig`.
- The evaluator initialized the judge model with the older SDK-specific `system_instruction` constructor argument. I moved the system instruction into `GenerateContentConfig`, matching the current Google Gen AI SDK pattern for model generation configuration.
- The sample default model was updated from `gemini-2.0-flash` to `gemini-2.5-flash`, matching current Vertex AI quickstart examples.

## Review Notes
The rubric registry, batch evaluation, and calibration examples are plain Python and are syntactically valid. The evaluator still relies on the model to compute the weighted total from the rubric; for production use, computing the weighted score in application code after receiving per-dimension scores would be more deterministic.
