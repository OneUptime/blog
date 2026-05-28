# Validation Summary: How to Implement Grounding with Google Search in Gemini on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Vertex AI
- Gemini
- Grounding with Google Search
- Google Gen AI SDK for Python
- Python function calling

## Sources Consulted
- Google Cloud documentation: Grounding with Google Search: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search
- Google Cloud documentation: Grounding API: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/grounding
- Google Cloud documentation: Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud documentation: Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Gen AI Python SDK documentation: https://googleapis.github.io/python-genai/
- Google Gen AI Python SDK repository and examples: https://github.com/googleapis/python-genai

## Issues Found
- The original code used the deprecated `vertexai.generative_models` module. Google deprecated the Generative AI module in the Vertex AI SDK on June 24, 2025, with removal scheduled for June 24, 2026. Updated examples to use the current `google-genai` SDK with `genai.Client(vertexai=True, ...)`.
- The original grounding examples used `Tool.from_google_search_retrieval(...)` as the primary Google Search grounding API. Updated the main examples to use `types.Tool(google_search=types.GoogleSearch())`, matching current official Google Search grounding samples.
- The metadata example only checked for `search_entry_point`; updated it to also read `web_search_queries`, and noted that Search Suggestions must be displayed in production when returned.
- The dynamic grounding comment described the threshold as model confidence. Updated the code and comment so it uses `types.DynamicRetrievalConfig(dynamic_threshold=...)` without incorrectly describing it as a confidence cutoff.
- The chat example used `model.start_chat()` and `chat.history`, which are from the deprecated SDK. Updated it to `client.chats.create(...)` and `chat.get_history()`.
- The research assistant, function calling, and fallback examples used deprecated model objects and function declaration APIs. Updated them to the current Google Gen AI SDK request/config style and `parameters_json_schema`.

## Review Notes
The updated snippets were checked for Python syntax. They still require a Google Cloud project with Vertex AI/Gemini access and appropriate authentication to run against the live API.
