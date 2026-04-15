# Validation Summary: How to Configure Dapr Conversation with Google AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha1)
- Google AI (Gemini models)
- Kubernetes secrets management
- Python (requests library)
- Node.js / Express
- curl

## Sources Consulted
- Dapr Conversation API documentation — https://docs.dapr.io/reference/components-reference/supported-conversation/
- Dapr Google AI component reference — https://docs.dapr.io/reference/components-reference/supported-conversation/googleai/
- Dapr components-contrib source code (conversation/googleai) — https://github.com/dapr/components-contrib
- Dapr runtime HTTP API source (conversation endpoints) — https://github.com/dapr/dapr
- Dapr Conversation proto definitions (ConversationRequest, ConversationInput)
- Google AI model documentation — https://ai.google.dev/gemini-api/docs/models

## Issues Found

1. **Input field name `message` should be `content`**: The Dapr alpha1 Conversation API proto defines the input field as `content`, not `message`. All three code examples (curl, Python, JavaScript) were using the wrong field name. Fixed all occurrences from `message` to `content`.

2. **`conversation.vertexai` component does not exist**: The "Using Vertex AI vs Google AI" section presented a full YAML configuration for a `conversation.vertexai` component type, which does not exist in Dapr. The supported conversation components do not include a Vertex AI provider. Replaced the section with a clarification that only `conversation.googleai` is available for Dapr Conversation workloads.

3. **`gemini-2.0-flash-thinking` is not a valid model ID**: The model names for thinking variants always included an `-exp` suffix (e.g., `gemini-2.0-flash-thinking-exp`), and all such models have been deprecated. Replaced with `gemini-2.5-flash`, which has integrated thinking capabilities.

4. **`max_tokens` parameter is not used by Dapr**: The `parameters` map in the alpha1 ConversationRequest proto exists but is explicitly marked as "not used" in the Dapr runtime source code. The blog showed `max_tokens` inside a `parameters` object, which would be silently ignored. Removed the unused `parameters` object and moved `temperature` to the top level of the request body, where it is a dedicated field in the proto.

5. **`cacheTTL` metadata field renamed to `responseCacheTTL`**: While `cacheTTL` works as a mapstructure alias, the documented/canonical metadata field name is `responseCacheTTL`. Updated to use the documented name.

6. **Gemini 1.5 Pro context window is 2M tokens, not 1M**: Gemini 1.5 Pro was expanded from 1M to 2M tokens. Updated the model list and prose to reflect the current 2M token context window.

## Review Notes
- The blog uses the `v1.0-alpha1` API endpoint, which is deprecated in favor of `v1.0-alpha2`. The alpha2 API has a significantly different request/response structure (using `messages` with typed role objects instead of `inputs` with `content`/`role` strings). The alpha1 API still functions but may be removed in a future Dapr release. A future update to this post should consider migrating examples to alpha2.
- The Python example overrides the model via a `parameters` field in the request body. Since `parameters` is not used by the runtime, per-request model override is not supported in the alpha1 API. The model must be set in the component configuration. The example was updated to remove this parameter.
