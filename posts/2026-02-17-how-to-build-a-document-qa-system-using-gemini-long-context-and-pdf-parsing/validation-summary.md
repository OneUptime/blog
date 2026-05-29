# Validation Summary: How to Build a Document QA System Using Gemini Long Context and PDF Parsing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini models
- Google Gen AI Python SDK
- PDF document understanding
- Gemini chat sessions
- Structured JSON output
- Context caching
- Cloud Storage document inputs

## Sources Consulted
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud document understanding guide for Gemini on Vertex AI: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/document-understanding
- Google Cloud structured output guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
- Google Cloud context cache overview: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview
- Google Cloud context cache create guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-create
- Google Cloud context cache use guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-use
- Google Gen AI Python SDK package, installed locally for constructor/API-shape checks: https://pypi.org/project/google-genai/

## Issues Found
- The post used the deprecated `vertexai.generative_models` and `vertexai.preview.caching` APIs. Google documents the Vertex AI SDK generative AI module as deprecated and unavailable after June 24, 2026, so I migrated the snippets to the current `google-genai` SDK with `genai.Client`, `types.GenerateContentConfig`, `types.Part`, `client.models.generate_content`, `client.chats.create`, and `client.caches`.
- The PDF part constructors used `Part.from_data(...)` and the Cloud Storage example used `Part.from_uri(uri=...)`. Updated them to the current `types.Part.from_bytes(...)` and `types.Part.from_uri(file_uri=...)` forms.
- The structured output example depended on an undefined `model` variable and used the old `GenerationConfig` class. Updated it to create a current Vertex AI client, pass `config=types.GenerateContentConfig(...)`, and use a response schema shape compatible with current Vertex AI structured output examples.
- The context caching example used the deprecated `CachedContent.create` and `GenerativeModel.from_cached_content` flow. Replaced it with `client.caches.create(...)`, `types.CreateCachedContentConfig(...)`, request-time `cached_content=cache.name`, and `client.caches.delete(...)`.
- The caching example described a large local manual without accounting for the documented 10 MB local blob limit for context caches. Added a size check and guidance to use Cloud Storage for larger PDFs.
- The error-handling example used a 100 MB PDF limit. Google documents a 50 MB maximum for PDF API or Cloud Storage imports for the covered Gemini document-understanding models, so I changed the limit to 50 MB.
- The chat-session description said chat avoids resending the document with every question. I changed this to say chat maintains conversation context and that context caching is the feature to use when avoiding repeated document content.
- The Cloud Storage MIME fallback used `application/octet-stream`, which is not appropriate for Gemini document inputs in the example. It now raises a `ValueError` for unsupported document extensions.

## Review Notes
The updated snippets were syntax-checked locally, and the current `google-genai` package was installed under `/tmp` to verify that the SDK classes and constructors used in the examples are present. Live Vertex AI calls were not executed because they require a configured Google Cloud project, enabled APIs, and credentials.
