# Validation Summary: How to Configure Dapr Conversation with Hugging Face

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation building block (alpha1 API)
- Hugging Face Inference API
- Hugging Face Dedicated Inference Endpoints
- Python (requests library)
- JavaScript (fetch API)
- Kubernetes secrets
- YAML component configuration

## Sources Consulted
- Dapr Conversation API proto definition (`ConversationRequest`, `ConversationInput` messages) — confirms `content` field, top-level `temperature`, no `max_tokens`
- Dapr components-contrib source: `conversation/metadata.go` (`LangchainMetadata` struct) — confirms `key`, `model`, `cacheTTL` (alias for `responseCacheTTL`), `endpoint` metadata fields
- Dapr HTTP API handler: `pkg/api/http/conversation.go` — confirms `v1.0-alpha1/conversation/{name}/converse` route
- Dapr universal conversation handler: `pkg/api/universal/conversation.go` — confirms model is set at init time, not overridable per-request
- Dapr component registration: `cmd/daprd/components/conversation_huggingface.go` — confirms `conversation.huggingface` type
- Dapr integration tests for conversation component — confirms request/response format
- Hugging Face model hub API — verified all five model IDs exist and are valid
- Hugging Face Inference Endpoints documentation — confirmed `*.endpoints.huggingface.cloud` domain pattern

## Issues Found

1. **Input field name was `"message"` instead of `"content"`** (curl, Python, and JavaScript examples): The Dapr Conversation alpha1 proto defines the input field as `content`, not `message`. Changed all three code examples to use `"content"`.

2. **`temperature` was nested inside `"parameters"` instead of being top-level**: In the Dapr Conversation alpha1 API, `temperature` is a top-level field on the request body, not inside a `parameters` map. Moved `temperature` to the top level in the curl and Python examples.

3. **`max_tokens` does not exist in the alpha1 API**: The Dapr Conversation alpha1 proto has no `max_tokens` field. Removed it from the curl example.

4. **Per-request model override claim was incorrect**: The blog claimed you could switch models at request time by setting `parameters.model`. The Dapr Conversation alpha1 handler sets the model at component initialization time and does not inspect `parameters` for a model override. Rewrote the "Using Different Models per Request" section to a simpler "Querying from Python" section and noted that different models require separate component definitions.

5. **Dedicated endpoint URL domain was incorrect**: The blog used `huggingface.cloud` but Hugging Face Dedicated Inference Endpoints use the domain `endpoints.huggingface.cloud`. Corrected the example URL.

## Review Notes
- The Dapr Conversation API also has a `v1.0-alpha2` version with a different request/response format that supports tool calling and structured outputs. The blog uses alpha1 which is valid but readers should be aware a newer version exists.
- The Hugging Face model IDs listed are all valid but represent the original Llama 3 generation. Newer versions (Llama 3.1, 3.2, 3.3) exist and may be preferred for new projects.
- The `parameters` map in the alpha1 API is a pass-through map that gets included in the response but does not control LLM behavior — it should not be used for inference settings.
