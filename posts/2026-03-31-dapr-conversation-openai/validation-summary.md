# Validation Summary: How to Configure Dapr Conversation with OpenAI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha1)
- OpenAI GPT models
- Dapr Go SDK
- Dapr HTTP API
- Kubernetes secrets
- Dapr local environment variable secret store

## Sources Consulted
- Dapr Conversation API HTTP reference (https://docs.dapr.io/reference/api/conversation_api/)
- Dapr OpenAI conversation component reference (https://docs.dapr.io/reference/components-reference/supported-conversation/openai/)
- Dapr Go SDK source code — `client` package, conversation types (https://github.com/dapr/go-sdk/tree/main/client)
- Dapr runtime source code — `pkg/api/http/conversation.go` (https://github.com/dapr/dapr)
- Dapr environment variable secret store reference (https://docs.dapr.io/reference/components-reference/supported-secret-stores/envvar-secret-store/)

## Issues Found

1. **`cacheTTL` metadata field name was incorrect (2 occurrences).** The correct metadata field name is `responseCacheTTL`, not `cacheTTL`. Changed both the component YAML example and the "Enabling Response Caching" section. Source: Dapr OpenAI conversation component reference.

2. **HTTP request body used `message` instead of `content` (2 occurrences).** The Dapr Conversation alpha1 API proto defines the input field as `content`, not `message`. Fixed in both the main curl example and the model override example.

3. **Go SDK `ConversationInput` used wrong field name `Message`.** The actual struct field is `Content`, not `Message`. Changed to `Content`.

4. **Go SDK used nonexistent constant `dapr.ConversationRoleUser`.** No such constant exists in the Dapr Go SDK. The `Role` field is an optional `*string` pointer. Removed the Role assignment since it defaults appropriately and avoids introducing pointer boilerplate that would distract from the tutorial.

5. **Go SDK `WithParameters` was chained on the request incorrectly.** `WithParameters` is a functional option that must be passed as a variadic argument to `ConverseAlpha1`, not chained on the request via method syntax. Additionally, it takes `map[string]*anypb.Any`, not `map[string]any`. Removed the `WithParameters` call to keep the example simple and correct.

6. **Model override was placed inside `parameters` instead of `metadata`.** The Dapr Conversation API uses the `metadata` field (not `parameters`) for component-level configuration overrides like model selection. Moved `"model": "gpt-4o-mini"` into a separate `metadata` object in the request body.

## Review Notes
- The post uses the alpha1 Conversation API (`v1.0-alpha1`), which is deprecated in favor of alpha2 (`v1.0-alpha2`). The alpha1 API still works for backward compatibility, but new implementations should use alpha2. The alpha2 API has a significantly different request/response format (uses `messages` array with typed message objects, and returns `choices` with `finishReason`). A future update of this post to target alpha2 would be valuable.
- The Go SDK's `ConverseAlpha1` method and `NewConversationRequest` function are also marked as deprecated in favor of their alpha2 counterparts (`ConverseAlpha2`, `ConversationRequestAlpha2`).
- The `ConversationInput` struct was changed from a pointer (`&dapr.ConversationInput{...}` then dereferenced with `*input`) to a direct value to simplify the code, since there was no reason to use a pointer that gets immediately dereferenced.
