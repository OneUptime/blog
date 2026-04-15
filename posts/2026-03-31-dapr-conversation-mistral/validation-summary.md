# Validation Summary: How to Configure Dapr Conversation with Mistral

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha1)
- Mistral AI language models (mistral-large-latest, mistral-small-latest, codestral-latest, open-mistral-nemo, mistral-embed)
- Dapr HTTP API
- Kubernetes secrets
- Python (requests library)
- JavaScript (fetch API)

## Sources Consulted
- Dapr Conversation API HTTP reference (https://docs.dapr.io/reference/api/conversation_api/)
- Dapr Mistral conversation component reference (https://docs.dapr.io/reference/components-reference/supported-conversation/setup-mistral/)
- Dapr components-contrib source code for Mistral conversation component (https://github.com/dapr/components-contrib/tree/master/conversation/mistral)
- Validated sibling post: `posts/2026-03-31-dapr-conversation-openai/` (used as reference for correct alpha1 API patterns)
- Validated sibling post: `posts/2026-03-31-dapr-conversation-api-reference/` (used as reference for API structure)
- Mistral AI model documentation (https://docs.mistral.ai/getting-started/models/overview/)

## Issues Found

1. **`cacheTTL` metadata field name was incorrect.** The correct metadata field name is `responseCacheTTL`, not `cacheTTL`. Changed in the component YAML example. Source: Dapr conversation component reference and validated OpenAI post.

2. **HTTP request inputs used `message` instead of `content` (5 occurrences across curl, Python, and JavaScript examples).** The Dapr Conversation alpha1 API defines the input field as `content`, not `message`. Fixed in all code examples: the basic curl request, the Python code generation function, the JavaScript multi-turn review function, and the function calling curl example.

3. **`max_tokens` parameter used wrong casing (2 occurrences).** The Dapr Conversation API uses camelCase `maxTokens`, not snake_case `max_tokens`. Fixed in the basic curl example and the Python code generation example.

4. **Model override was placed inside `parameters` instead of `metadata`.** In the Python Codestral example, `"model": "codestral-latest"` was nested inside `parameters`. The Dapr Conversation API uses the `metadata` field for component-level configuration overrides like model selection. Moved the model into a separate `metadata` object in the request body.

## Review Notes
- The post uses the alpha1 Conversation API (`v1.0-alpha1`), which is consistent with other posts in this blog series. The alpha1 API is deprecated in favor of alpha2 (`v1.0-alpha2`), which has a significantly different request/response format. A future update to alpha2 would be valuable.
- The function calling example passes `tools` inside `parameters`. While function calling is supported by both Mistral and the Dapr Conversation API, the exact mechanism for passing tool definitions through the alpha1 API is not fully documented. In alpha2, `tools` is a top-level request field. This example may need adjustment when the post is updated to alpha2.
- The `mistral-embed` and `open-mistral-nemo` model identifiers could not be independently verified as current Mistral model aliases. The post correctly notes that `mistral-embed` is not suitable for conversation use.
- The response format `outputs[0].result` is correct for the alpha1 API.
