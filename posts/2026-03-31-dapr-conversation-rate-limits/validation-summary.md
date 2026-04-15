# Validation Summary: How to Handle Conversation API Rate Limits in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Conversation API (alpha1)
- Dapr State Management API
- Python (requests, asyncio, functools)
- LLM rate limiting patterns (exponential backoff, token bucket, caching, multi-provider failover)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr State Store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Conversation overview (response caching): https://docs.dapr.io/developing-applications/building-blocks/conversation/conversation-overview/
- Dapr OpenAI component reference (responseCacheTTL): https://docs.dapr.io/reference/components-reference/supported-conversation/openai/
- Dapr proto definitions (ConversationInput, ConversationResponse): https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/ai.proto
- Dapr HTTP API source (conversation endpoints): https://github.com/dapr/dapr/blob/master/pkg/api/http/conversation.go

## Issues Found

1. **Incorrect input field name in Strategy 3**: The code used `{"message": prompt, "role": "user"}` but the Dapr Conversation alpha1 API expects `"content"` not `"message"` for the input text field. Fixed to `{"content": prompt, "role": "user"}`.

2. **Incorrect state store TTL placement in Strategy 2**: The code placed TTL in `"options": {"ttlInSeconds": ttl_seconds}`, but Dapr state store TTL must be set via the `"metadata"` field, not `"options"`. The `"options"` field is reserved for concurrency and consistency settings. Additionally, the TTL value must be a string. Fixed to `"metadata": {"ttlInSeconds": str(ttl_seconds)}`.

3. **Incorrect cache metadata field name**: The post referenced a built-in `cacheTTL` metadata field for component-level caching. The correct field name is `responseCacheTTL`. Fixed the reference.

## Review Notes
- The post uses the `v1.0-alpha1` Conversation API endpoint, which is deprecated in favor of `v1.0-alpha2`. The alpha2 API has a significantly different request/response schema (uses `messages` arrays with typed objects like `ofUser`/`ofSystem`, and responses use `outputs[].choices[].message.content` instead of `outputs[].result`). The alpha1 endpoint still functions but may be removed in a future Dapr release. A future update of this post to target alpha2 would require rewriting the request/response handling across all examples.
- The `deque` import in Strategy 3 is unused but harmless.
- The token bucket implementation in Strategy 3 is not thread-safe; in a multi-threaded Python application, concurrent access to `tokens` and `last_refill` could cause race conditions. This is acceptable for the tutorial context.
