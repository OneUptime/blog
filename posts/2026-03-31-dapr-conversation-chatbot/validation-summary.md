# Validation Summary: How to Use Dapr Conversation API for Chatbot Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (v1.0-alpha1)
- Dapr State Management API
- Node.js / Express
- OpenAI (via Dapr component)
- Ollama (via Dapr component)

## Sources Consulted
- Dapr Conversation API Reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Store TTL Documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Previously validated Dapr Conversation blog posts in this repository (openai, ollama, streaming, hugging-face)

## Issues Found

1. **Incorrect input field name (`message` → `content`)**: The Dapr Conversation API `ConversationInput` schema uses `content` for the text field, not `message`. All occurrences in the main chat service code and the system prompt helper were changed from `message` to `content` (e.g., `{ message, role: 'user' }` → `{ content: message, role: 'user' }`).

2. **Incorrect `temperature` placement and non-existent `max_tokens` field**: The request body used `parameters: { temperature: 0.7, max_tokens: 500 }`. Per the Dapr Conversation API spec, `temperature` is a top-level field in the request body, not nested inside `parameters`. Additionally, `max_tokens` is not a standard field in the v1.0-alpha1 Conversation API. Changed to `temperature: 0.7` at the top level and removed `max_tokens`.

3. **Incorrect TTL placement in state save (`options` → `metadata`)**: The state save payload used `options: { ttlInSeconds: 3600 }`. Per the Dapr State API documentation, TTL must be specified in `metadata`, not `options` (which is reserved for concurrency/consistency settings). The value must also be a string. Changed to `metadata: { ttlInSeconds: "3600" }`.

## Review Notes
- The Conversation API endpoint uses the `v1.0-alpha1` prefix, indicating it is an alpha API that may change in future Dapr releases.
- The architecture pattern of using Dapr State for conversation history and Dapr Conversation for LLM calls is sound and represents a clean separation of concerns.
- The system prompt helper function only includes the system message when history is empty (first turn), which means it will be stored in the history for subsequent turns — this is a correct approach.
- The Express.js code is syntactically correct and follows standard patterns.
- The curl examples in the client section are correct and match the API endpoints defined in the code.
