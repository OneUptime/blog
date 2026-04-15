# Validation Summary: How to Configure Dapr Conversation with DeepSeek

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha1)
- DeepSeek language models (deepseek-chat / DeepSeek-V3, deepseek-reasoner / DeepSeek-R1)
- Dapr HTTP API
- Kubernetes secrets
- Python (requests library)

## Sources Consulted
- Dapr Conversation API HTTP reference (https://docs.dapr.io/reference/api/conversation_api/)
- Validated sibling post: `posts/2026-03-31-dapr-conversation-openai/` (used as authoritative reference for correct alpha1 API field names and patterns)
- Validated sibling post: `posts/2026-03-31-dapr-conversation-mistral/` (cross-referenced for consistent field naming conventions)
- Validated sibling post: `posts/2026-03-31-dapr-conversation-api-reference/` (used as reference for API structure)
- DeepSeek platform documentation (https://platform.deepseek.com)

## Issues Found

1. **`cacheTTL` metadata field name was incorrect.** The correct metadata field name is `responseCacheTTL`, not `cacheTTL`. Changed in the component YAML example. Source: Dapr conversation component reference and validated OpenAI post.

2. **HTTP request inputs used `message` instead of `content` (5 occurrences across curl and Python examples).** The Dapr Conversation alpha1 API defines the input field as `content`, not `message`. Fixed in the basic curl request, the DeepSeek-R1 reasoning curl request, the Python code review function, and both model comparison curl requests.

3. **`max_tokens` parameter used wrong casing (2 occurrences).** The Dapr Conversation API uses camelCase `maxTokens`, not snake_case `max_tokens`. Fixed in the basic curl example and the Python code review example.

4. **Model override was placed inside `parameters` instead of `metadata`.** In the DeepSeek-R1 reasoning example, `"model": "deepseek-reasoner"` was nested inside `parameters`. The Dapr Conversation API uses the `metadata` field for component-level configuration overrides like model selection. Moved the model into a separate `metadata` object in the request body.

## Review Notes
- The post uses the alpha1 Conversation API (`v1.0-alpha1`), which is consistent with other posts in this blog series. The alpha1 API is deprecated in favor of alpha2 (`v1.0-alpha2`), which has a significantly different request/response format. A future update to alpha2 would be valuable.
- The DeepSeek model names (`deepseek-chat` for V3 and `deepseek-reasoner` for R1) are consistent with DeepSeek's official API model identifiers.
- The component type `conversation.deepseek` follows the standard Dapr naming pattern (`conversation.{provider}`) seen across all conversation components.
- The response format `outputs[0].result` used in the Python example is correct for the alpha1 API.
- The comparing models section uses abbreviated YAML snippets (missing `apiVersion` and `kind`) which is acceptable as they are clearly meant as partial examples showing only the differing fields.
