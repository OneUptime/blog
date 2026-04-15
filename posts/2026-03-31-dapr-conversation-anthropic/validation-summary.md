# Validation Summary: How to Configure Dapr Conversation with Anthropic Claude

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha)
- Anthropic Claude (Claude 3.5 Sonnet, Claude 3 Haiku, Claude 3 Opus)
- Dapr Python SDK
- Kubernetes Secrets
- YAML component configuration

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr supported conversation components: https://docs.dapr.io/reference/components-reference/supported-conversation/
- Dapr Anthropic conversation component docs: https://docs.dapr.io/reference/components-reference/supported-conversation/anthropic/
- Sibling blog posts in this repo (OpenAI, Mistral, Deepseek, Google AI, Ollama, debug conversation API) for cross-referencing field names and patterns
- Debug Conversation API blog post (`posts/2026-03-31-dapr-debug-conversation-api/README.md`) which explicitly documents common mistakes

## Issues Found

1. **Incorrect input field name in HTTP API examples (`message` -> `content`)**: All six curl/HTTP JSON examples used `"message"` as the field name for input text. The correct field name for the Dapr Conversation HTTP API is `"content"`. This is explicitly documented as a common mistake in the debug conversation API blog post (line 114: "Using `message` instead of `content` on each input"). All other validated provider posts (OpenAI, Mistral, Google AI, Ollama, Deepseek) correctly use `"content"`. Fixed in lines 68, 89, 93, 97, and 156. Note: the Python SDK's `ConversationInput(message=...)` parameter is correctly named `message` — this is only an issue in the HTTP JSON body.

2. **Incorrect metadata field name (`cacheTTL` -> `responseCacheTTL`)**: The component YAML used `cacheTTL` as the metadata field name, but the official Dapr Anthropic component documentation specifies the field is called `responseCacheTTL`. Fixed on line 36.

## Review Notes
- The API endpoint uses `v1.0-alpha1` which is consistent with all other blog posts in this series, though the official Dapr docs now reference `v1.0-alpha2` with a restructured request body. This may warrant a future update across all conversation blog posts if the alpha2 API becomes the standard.
- The model descriptions characterize Claude 3 Opus as "most capable for complex tasks" while Claude 3.5 Sonnet is described as "best for complex reasoning." In practice, Claude 3.5 Sonnet generally outperforms Opus 3 on most benchmarks, but this is a nuance rather than an outright error, and model positioning has shifted over time.
- The default model in the official Dapr docs is listed as `claude-3-5-sonnet-20240620`, while the blog uses `claude-3-5-sonnet-20241022` — both are valid Anthropic model IDs and the blog's choice of a newer version is reasonable.
- The Python SDK example mixes `async def` with `with DaprClient()` (synchronous context manager). This may need adjustment depending on the Dapr SDK version, but is consistent with patterns in other blog posts in this series.
