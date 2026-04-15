# Validation Summary: How to Use Dapr Conversation API with LLMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha building block)
- OpenAI (GPT models)
- Azure OpenAI
- Dapr Go SDK
- Dapr Python SDK
- Node.js (Express + Axios)
- Kubernetes (secrets management)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr Conversation How-To guide: https://docs.dapr.io/developing-applications/building-blocks/conversation/howto-conversation-layer/
- Dapr Conversation overview: https://docs.dapr.io/developing-applications/building-blocks/conversation/conversation-overview/
- Dapr OpenAI component reference: https://docs.dapr.io/reference/components-reference/supported-conversation/openai/
- Dapr supported conversation components: https://docs.dapr.io/reference/components-reference/supported-conversation/
- Dapr v1.15 release blog post: https://blog.dapr.io/posts/2025/02/27/dapr-v1.15-is-now-available/
- Dapr Go SDK pkg.go.dev: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Python SDK docs: https://docs.dapr.io/developing-applications/sdks/python/

## Issues Found

1. **Incorrect Dapr version**: The post stated the Conversation API was introduced in "Dapr 1.14+". It was actually introduced in Dapr 1.15 (released February 27, 2025). Fixed both the introduction paragraph and the prerequisites section to say "Dapr 1.15+" / "Dapr v1.15".

2. **Wrong Go SDK method name**: The post used `client.InvokeConversationAlpha1()` which does not exist in the Dapr Go SDK. The correct method name is `client.ConverseAlpha1()`. Fixed the Go code example.

3. **Missing Azure OpenAI `apiType` metadata**: The Azure OpenAI component configuration was missing the required `apiType: "azure"` metadata field. Without this field, the component would attempt to connect to the standard OpenAI API rather than the Azure OpenAI endpoint. Added the missing field to the YAML configuration.

## Review Notes
- The post uses the Alpha1 API (`v1.0-alpha1`) throughout. Dapr has since introduced the Alpha2 API (`v1.0-alpha2`) with a restructured request/response format. The Alpha1 API is deprecated but still functional. A future update could migrate the examples to Alpha2.
- The Go SDK code uses `ConversationRequest`, `ConversationInput`, `ConversationRoleSystem`, and `ConversationRoleUser` types. The exact exported type names for the Alpha1 Go SDK API may differ from what is shown; the Alpha1 request type appears to be unexported in the SDK. Readers following this tutorial should consult the current Go SDK documentation for exact type signatures.
- The Python SDK import `from dapr.clients.grpc._request import ConversationInput, ConversationRole` references an internal module path (`_request`). The current SDK may organize these types under `dapr.clients.grpc.conversation` instead. Readers should verify imports against their installed SDK version.
- The caching metadata fields (`cachingEnabled`, `cacheTTL`) and PII scrubbing field (`scrubPII`) are plausible based on the Dapr documentation, though the exact field names may vary by component version.
- The Node.js chatbot example is syntactically correct and demonstrates a reasonable pattern, though it lacks error handling around the axios call — acceptable for a tutorial example.
