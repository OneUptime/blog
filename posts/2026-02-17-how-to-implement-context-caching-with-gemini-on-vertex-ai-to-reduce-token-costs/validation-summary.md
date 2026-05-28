# Validation Summary: How to Implement Context Caching with Gemini on Vertex AI to Reduce Token Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Vertex AI
- Gemini
- Context caching
- Google Gen AI Python SDK
- Python

## Sources Consulted
- Vertex AI context caching overview: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview
- Vertex AI create a context cache: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-create
- Vertex AI use a context cache: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-use
- Vertex AI get information about a context cache: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-getinfo
- Vertex AI update a context cache: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-update
- Vertex AI delete a context cache: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-delete
- Google Gen AI Python SDK reference: https://googleapis.github.io/python-genai/
- Google Cloud Generative AI pricing: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing

## Issues Found
- The post used the older `vertexai.preview.caching` and `GenerativeModel.from_cached_content` API style. Updated examples to use the current Google Gen AI Python SDK (`google-genai`) with `client.caches.create`, `client.models.generate_content`, `GenerateContentConfig(cached_content=...)`, and cache lifecycle methods.
- The post used `gemini-1.5-pro-002` and `gemini-1.5-flash-002` for explicit caching. Current Vertex AI documentation lists explicit context caching support for Gemini 2.0 and Gemini 2.5 model families, so the examples now use `gemini-2.5-pro` and `gemini-2.5-flash`.
- The `Part.from_uri` examples omitted the current `file_uri=` keyword used by the official SDK samples. Updated the code snippets accordingly.
- The cost comparison omitted cache creation input cost, cached-input token charges, and current explicit cache storage pricing. Updated the calculation using current Gemini 2.5 Pro pricing for <=200K-token prompts and explicit cache storage.
- The service example treated `prompt_token_count` as new input tokens. Updated it to subtract `cached_content_token_count`, since cached tokens are included separately in usage metadata.
- The post said the minimum cache size is 32,768 tokens. Current Vertex AI documentation states the minimum cache token count is 2,048 tokens for all models, so this was corrected.

## Review Notes
- Google documentation notes that Vertex AI services are now part of Gemini Enterprise Agent Platform and that the Vertex AI documentation is no longer being updated. The post remains technically relevant, but future updates should watch for further naming or SDK changes.
- The examples are syntactically valid Python, but they were not executed against Google Cloud because that would require project credentials, Cloud Storage objects, enabled APIs, and billable model calls.
