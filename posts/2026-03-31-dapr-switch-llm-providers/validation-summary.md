# Validation Summary: How to Switch LLM Providers Without Changing Code Using Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Conversation API (alpha1)
- OpenAI (conversation.openai component)
- Anthropic (conversation.anthropic component)
- Ollama (conversation.ollama component)
- Python (HTTP requests to Dapr sidecar)
- Kubernetes / Helm for deployment
- Dapr component YAML configuration

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr OpenAI conversation component docs: https://docs.dapr.io/reference/components-reference/supported-conversation/openai/
- Dapr Anthropic conversation component docs: https://docs.dapr.io/reference/components-reference/supported-conversation/anthropic/
- Dapr components-contrib source code (conversation components): https://github.com/dapr/components-contrib/tree/main/conversation
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr proto definitions (ai.proto): https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/ai.proto
- Ollama conversation component source: https://github.com/dapr/components-contrib/tree/main/conversation/ollama

## Issues Found

### 1. Input field name: `message` should be `content`
- **What was wrong:** The Python code examples used `"message"` as the input field name (e.g., `{"message": question, "role": "user"}`).
- **What was changed:** Replaced `"message"` with `"content"` in both the `ask_llm` and `ask_with_fallback` functions.
- **Why:** The Dapr Conversation API reference and protobuf definition (`ConversationInput`) specify the field as `content`, not `message`. While some Dapr quickstart examples in JavaScript use `message`, the authoritative API reference and proto definition use `content`.

### 2. `temperature` placement: moved from `parameters` to top-level
- **What was wrong:** The request body had `temperature` nested inside a `"parameters"` object: `"parameters": {"temperature": temperature, "max_tokens": 500}`.
- **What was changed:** Moved `temperature` to a top-level field in the request JSON body: `"temperature": temperature`.
- **Why:** Per the Dapr Conversation API reference, `temperature` is a top-level field in the request body, not nested inside a `parameters` map.

### 3. `max_tokens` removed
- **What was wrong:** The request body included `"max_tokens": 500` inside a `parameters` object.
- **What was changed:** Removed `max_tokens` entirely from the request body.
- **Why:** The Dapr Conversation alpha1 API does not expose a `max_tokens` parameter. The supported top-level request fields are `inputs`, `temperature`, `cacheTTL`, and `scrubPII`.

### 4. Ollama endpoint URL: added `/v1` suffix
- **What was wrong:** The Ollama component YAML and Helm template specified the endpoint as `http://localhost:11434` and `http://ollama:11434` respectively.
- **What was changed:** Updated to `http://localhost:11434/v1` and `http://ollama:11434/v1`.
- **Why:** The Dapr Ollama conversation component's default endpoint is `http://localhost:11434/v1` (as seen in the source code). The component uses the OpenAI-compatible API that Ollama exposes at the `/v1` path. Omitting `/v1` would cause incorrect URL construction.

## Review Notes
- The `conversation.ollama` component exists in the Dapr components-contrib codebase but is **not listed in the official Dapr v1.15 documentation** as a supported conversation component. It works but is effectively undocumented. The blog may want to note this.
- The Dapr Conversation API is still in **alpha** (`v1.0-alpha1`). A newer `v1.0-alpha2` version exists in the Dapr source that adds support for tools and structured outputs. The API surface may change before reaching stable.
- The Anthropic model ID `claude-3-5-sonnet-20241022` used in the blog is valid. The official Dapr docs reference the older `claude-3-5-sonnet-20240620`, but the blog's choice of the newer model version is correct.
- The `version: v1` field in component specs is used in some Dapr quickstart examples but is often omitted in the official component reference docs. It is not incorrect to include it.
- The switching pattern using `cp` to copy component files works but would cause issues if multiple YAML files define the same component name in the same components directory. The blog's approach of copying to a single target file is correct.
