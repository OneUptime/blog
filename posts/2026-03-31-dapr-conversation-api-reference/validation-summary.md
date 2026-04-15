# Validation Summary: How to Use the Dapr Conversation API Reference

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr Conversation API (alpha1)
- OpenAI GPT (via Dapr conversation.openai component)
- Anthropic Claude (via Dapr conversation.anthropic component)
- Azure OpenAI, AWS Bedrock, Hugging Face (mentioned as supported providers)
- Dapr Python SDK (dapr-client)
- YAML component configuration

## Sources Consulted
- Dapr runtime source code — HTTP conversation endpoint registration (`dapr/dapr/pkg/api/http/conversation.go`)
- Dapr proto definitions — `ConversationRequest`, `ConversationInput`, `ConversationResponse` schemas (alpha1 and alpha2)
- Dapr components-contrib source — conversation component implementations (`dapr/components-contrib/conversation/`)
- Dapr components-contrib metadata.yaml files for OpenAI and Anthropic conversation components
- Dapr Python SDK source — `dapr/clients/grpc/conversation.py` for `ConversationInput` class definition and `converse_alpha1` method signature
- Dapr conversation metadata struct (`dapr/components-contrib/conversation/metadata.go`) for caching field names

## Issues Found

1. **HTTP request field name `message` should be `content`**: The curl examples used `"message"` as the field name in conversation inputs. The Dapr proto schema defines `ConversationInput` with a `content` field, not `message`. Fixed all occurrences in curl examples to use `"content"`.

2. **`temperature` incorrectly nested inside `parameters` object**: The blog placed `temperature` and `maxTokens` inside a `"parameters"` object in the request body. In the alpha1 API, `temperature` is a top-level request field. Fixed by moving `temperature` to the top level of the request body.

3. **`maxTokens` does not exist in the API request schema**: The `maxTokens` field is not part of the Dapr Conversation API request proto. It does not exist as a per-request parameter. Removed from the request example.

4. **Python SDK import path incorrect**: `ConversationInput` is defined in `dapr.clients.grpc.conversation`, not `dapr.clients.grpc._request`. Fixed the import statement.

5. **`cachingEnabled` component metadata field does not exist**: There is no `cachingEnabled` boolean metadata field on Dapr conversation components. Caching is controlled by the `cacheTTL` field (a Go duration string like `"10m"`). Fixed in the OpenAI component definition and the caching section.

6. **`cacheSize` component metadata field does not exist**: There is no `cacheSize` metadata field. The in-memory cache uses TTL-based expiration via `cacheTTL`. Removed `cacheSize` from the caching section.

7. **`piiScrubbingEnabled` component metadata field does not exist**: PII scrubbing is not a component-level metadata setting. It is enabled per-request via the `scrubPII` boolean field in the request body (both at the top level and per-input). Rewrote the PII scrubbing section to show the correct request-based approach with a curl example.

8. **Anthropic model name outdated**: Changed `claude-3-5-sonnet-20241022` to `claude-sonnet-4-20250514` to match the current Dapr default for the Anthropic component.

## Review Notes
- The blog uses the `v1.0-alpha1` API version, which still works but is deprecated. The current version is `v1.0-alpha2` with a significantly different request/response schema (typed message roles, tool calling support, prompt caching, structured output). A future update to cover alpha2 would be valuable.
- The alpha2 API response format differs substantially: it uses `outputs[0].choices[0].message.content` instead of `outputs[0].result`.
- Multi-turn conversation in alpha1 works by passing multiple inputs in the `inputs` array. The `contextID` field exists but the runtime only echoes it back — there is no server-side session management. The alpha2 API has better multi-turn support with typed message roles.
- The Python SDK also has a `converse_alpha2` method with additional parameters for tools, tool choice, response format, and prompt cache retention.
