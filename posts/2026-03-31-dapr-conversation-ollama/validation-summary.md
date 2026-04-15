# Validation Summary: How to Configure Dapr Conversation with Ollama

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha1)
- Ollama (local LLM inference server)
- Kubernetes (Deployment, Service, PVC, init containers)
- Docker (GPU-enabled containers)
- Python (requests library for HTTP calls)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr Ollama conversation component docs: https://docs.dapr.io/reference/components-reference/supported-conversation/ollama/
- Dapr components-contrib source (conversation/ollama): https://github.com/dapr/components-contrib
- Dapr Conversation proto definitions (ConversationInput, ConversationRequest)
- Ollama official documentation: https://ollama.com
- Ollama API documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama Docker Hub: https://hub.docker.com/r/ollama/ollama

## Issues Found

1. **Request body field `message` should be `content`** (critical): The Dapr Conversation API `ConversationInput` proto uses the field name `content`, not `message`. Using `message` would send empty content to the LLM. Fixed in both the curl example and the Python code example.

2. **`cacheTTL` should be `responseCacheTTL`**: The canonical metadata field name documented by Dapr is `responseCacheTTL`. While `cacheTTL` works as an alias (via mapstructure alias in the Go struct), the blog should use the documented canonical name for consistency. Fixed in the component YAML.

3. **`temperature` was nested inside `parameters` instead of being top-level**: In the Dapr Conversation alpha1 API, `temperature` is a top-level field on the request body, not nested inside `parameters`. Fixed in the Python code example.

4. **Per-request model override used `parameters` instead of `metadata`**: The Dapr Conversation API uses the `metadata` field (not `parameters`) for per-request overrides of component configuration like model name. Fixed in the Python code example.

## Review Notes
- The post uses the `v1.0-alpha1` API version throughout. This version is deprecated in favor of `v1.0-alpha2`, which has a different response format (`outputs[].choices[].message.content` instead of `outputs[].result`). The alpha1 API still functions, but new implementations should prefer alpha2. This was not changed to avoid a cascading rewrite of all examples, but should be noted for future updates.
- The init container approach for pre-pulling models in Kubernetes starts an Ollama server, pulls the model, then kills it. This is a pragmatic workaround but should be noted that it requires the init container to have sufficient resources allocated, and the volume mount for `/root/.ollama` must be shared between the init container and the main container for the pulled model to persist.
- The Kubernetes deployment example does not include GPU resource requests (e.g., `nvidia.com/gpu`), which would be needed for GPU-accelerated inference in a cluster with GPU nodes.
