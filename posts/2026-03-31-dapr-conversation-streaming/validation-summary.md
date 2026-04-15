# Validation Summary: How to Use Dapr Conversation API with Streaming Responses

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha, v1.15+)
- OpenAI (via Dapr conversation.openai component)
- Node.js / Express (Server-Sent Events proxy)
- Python / requests (streaming HTTP client)
- HTML/JavaScript (browser SSE client)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr Conversation overview: https://docs.dapr.io/developing-applications/building-blocks/conversation/conversation-overview/
- Dapr supported conversation components: https://docs.dapr.io/reference/components-reference/supported-conversation/
- Dapr Conversation how-to guide: https://docs.dapr.io/developing-applications/building-blocks/conversation/howto-conversation-layer/
- Dapr proto definitions (ai.proto): https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/ai.proto
- Dapr components-contrib conversation source: https://github.com/dapr/components-contrib/tree/main/conversation/
- OpenAI conversation component metadata: https://github.com/dapr/components-contrib/blob/main/conversation/openai/metadata.yaml

## Issues Found

### 1. Streaming is not supported by the Dapr Conversation API (Critical)
**What was wrong:** The entire post claimed the Dapr Conversation API supports streaming via a `stream` component metadata field and a `parameters.stream` per-request option. This is incorrect — the Dapr Conversation API (as of v1.15) uses unary request/response and has no streaming support. The proto definitions confirm this (both `ConverseAlpha1` and `ConverseAlpha2` are unary RPCs, not server-streaming). A TODO in the proto even references `StreamOptions` as a future addition.

**What was changed:** Added a prominent disclaimer noting that the Dapr Conversation API does not natively support streaming. Removed the non-existent `stream` component metadata field. Removed the non-existent `parameters.stream` request parameter. Reframed the streaming code examples as patterns that could be applied on top of the API. Updated the summary accordingly.

### 2. Incorrect request body field name: `message` should be `content`
**What was wrong:** All code examples used `"message"` as the field name in the inputs array (e.g., `{"message": "...", "role": "user"}`). The correct field name per the Dapr Conversation API documentation is `"content"` (e.g., `{"content": "...", "role": "user"}`).

**What was changed:** Replaced `message` with `content` in the curl command, Node.js code, and Python code request bodies.

### 3. Non-existent `stream` metadata field in component YAML
**What was wrong:** The component YAML included `- name: stream` / `value: "true"` as a metadata field. This field does not exist in the OpenAI conversation component. Valid metadata fields are: `key`, `model`, `endpoint`, `cacheTTL`, `apiVersion`, `apiType`.

**What was changed:** Replaced the `stream` metadata entry with `cacheTTL` which is a valid metadata field.

### 4. Non-existent `parameters` object in request body
**What was wrong:** The curl example used a `"parameters": {"stream": true}` field in the request body. The Dapr Conversation API does not have a `parameters` field. Valid top-level request fields are: `inputs`, `temperature`, `cacheTTL`, `scrubPII`.

**What was changed:** Replaced `"parameters": {"stream": true}` with `"temperature": 0.7` which is a valid top-level request field.

### 5. Inaccurate provider list
**What was wrong:** The provider list claimed Ollama and Google AI were supported providers with streaming. Ollama and Google AI exist in the components-contrib source code but are not officially documented in the Dapr v1.15 docs. Mistral and Hugging Face (which are officially documented) were missing. Additionally, streaming claims for all providers were incorrect.

**What was changed:** Replaced the streaming support table with an accurate list of officially supported Dapr Conversation providers (OpenAI, Anthropic, AWS Bedrock, DeepSeek, Mistral, Hugging Face) with a note that native streaming is not available.

## Review Notes
- The Dapr Conversation API is in alpha status and may change significantly in future releases. The API endpoint path `/v1.0-alpha1/conversation/` reflects this alpha status.
- The streaming code examples (Node.js SSE proxy, browser client, Python streaming client) are syntactically correct and demonstrate valid SSE patterns, but they will not produce actual streaming behavior when used with the current Dapr Conversation API since it returns complete responses.
- The newer Alpha2 version of the Conversation API (available via gRPC) adds support for tool calling, structured output, and usage statistics, but still does not include streaming.
- A future version of Dapr may add streaming support — the proto source contains a TODO referencing `StreamOptions`.
- The `message` field used throughout the original post does not exist at all in the Alpha1 API; the correct field is `content`. In the newer Alpha2 gRPC API, message structure is completely different (typed message objects with nested content arrays).
