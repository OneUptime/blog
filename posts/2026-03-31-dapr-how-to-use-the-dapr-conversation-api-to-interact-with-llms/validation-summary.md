# Validation Summary: How to Use the Dapr Conversation API to Interact with LLMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.15+)
- Dapr Conversation API (alpha1)
- OpenAI GPT / Azure OpenAI
- Node.js (with Dapr HTTP API)
- Python (with Dapr Python SDK)
- Kubernetes (for secret management)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr supported conversation components: https://docs.dapr.io/reference/components-reference/supported-conversation/
- Dapr OpenAI conversation component: https://docs.dapr.io/reference/components-reference/supported-conversation/openai/
- Dapr components-contrib source (conversation/openai/metadata.yaml): https://github.com/dapr/components-contrib
- Dapr Python SDK source (converse_alpha1 method): https://github.com/dapr/python-sdk
- Dapr JS SDK source (no conversation support): https://github.com/dapr/js-sdk
- Dapr v1.15 release notes (Conversation API introduction): https://blog.dapr.io/

## Issues Found

1. **Dapr version requirement was wrong**: Changed `v1.14+` to `v1.15+`. The Conversation API was introduced in Dapr v1.15, not v1.14.

2. **`conversation.azure.openai` component type does not exist**: Azure OpenAI is configured through the same `conversation.openai` component type with `apiType: "azure"` in the metadata. Rewrote the Azure OpenAI component YAML to use the correct type and fields (`apiType`, `key` instead of `apiKey`, `model` instead of `deploymentName`).

3. **HTTP request body used `message` instead of `content`**: The alpha1 Conversation API proto definition uses `content` as the field name for input text, not `message`. Fixed in the curl example.

4. **`temperature` was incorrectly nested inside `parameters`**: In the alpha1 API, `temperature` is a top-level field on the request, not inside the `parameters` map. Moved `temperature` to the top level and kept `maxTokens` in `parameters`.

5. **Response body incorrectly included `role` field**: The alpha1 `ConversationResult` proto has `result` and `parameters` fields but no `role` field. Removed `"role": "assistant"` from the example response.

6. **Node.js SDK does not support the Conversation API**: The `@dapr/dapr` JavaScript SDK has no `client.conversation.converse()` method. As of Dapr v1.15, only Go, .NET, Rust, and Python SDKs have conversation API support. Rewrote all Node.js examples to use the Dapr HTTP API via `fetch()` instead.

7. **Python SDK method name was wrong**: Changed `client.converse()` to `client.converse_alpha1()`. Also fixed: `temperature` is a keyword argument on the method (not inside `parameters`), and input dicts use `content` instead of `message`.

8. **Unused import removed**: Removed `from dapr.clients.grpc._proto.dapr.proto.runtime.v1 import dapr_pb2` which was imported but never used in the Python example.

## Review Notes
- The Conversation API is still in alpha (alpha1/alpha2). The alpha2 API has a significantly different request/response format. This post uses alpha1 which is deprecated but still supported. A future update may want to migrate examples to alpha2.
- The `cacheTTL` metadata field in the OpenAI component may have been renamed to `responseCacheTTL` in the documentation, though the components-contrib source still uses `cacheTTL`. Left as-is since it matches the source metadata.yaml.
- The Node.js examples now use the global `fetch()` API, which requires Node.js 18+ (where it is available without flags).
