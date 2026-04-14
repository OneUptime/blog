# Validation Summary: How to Test Dapr Conversation API Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Conversation API (alpha1)
- Dapr CLI (`dapr run`)
- Dapr Echo conversation component (`conversation.echo`)
- Dapr Ollama conversation component (`conversation.ollama`)
- Ollama (local LLM runtime)
- Node.js / Jest / Supertest (unit testing)
- Python / Pytest (integration testing)
- Make (build automation)

## Sources Consulted
- Dapr Conversation API reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr Conversation quickstart: https://docs.dapr.io/getting-started/quickstarts/conversation-quickstart/
- Dapr How-To: Converse with an LLM: https://docs.dapr.io/developing-applications/building-blocks/conversation/howto-conversation-layer/
- Dapr Echo component (Local Testing): https://docs.dapr.io/reference/components-reference/supported-conversation/local-echo/
- Dapr Ollama component: https://docs.dapr.io/reference/components-reference/supported-conversation/ollama/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Conversation building block proposal: https://github.com/dapr/proposals/blob/main/20240618-RCBS-Conversation-building-block.md

## Issues Found

### 1. Incorrect field name in conversation API request body
- **What was wrong:** All Python test code used `"message"` as the field name in conversation API input objects (e.g., `{"message": "What is 2 + 2?", "role": "user"}`).
- **What was changed:** Replaced `"message"` with `"content"` in all three test functions (`test_real_llm_response_is_coherent`, `test_response_contains_json_when_requested`, `test_summary_format`).
- **Why:** The Dapr Conversation API alpha1 input schema uses `content` (not `message`) for the text field in input objects. Using `message` would result in empty or errored requests.

### 2. Deprecated CLI flag `--components-path`
- **What was wrong:** All `dapr run` commands (inline example and Makefile) used `--components-path`, which is deprecated.
- **What was changed:** Replaced `--components-path` with `--resources-path` in all four occurrences (1 inline command + 2 Makefile targets).
- **Why:** The `--components-path` flag has been deprecated in favor of `--resources-path` (short flag `-d`) in the Dapr CLI. While the old flag may still work for backward compatibility, the blog should use the current recommended flag.

### 3. Invalid `endpoint` metadata field on Ollama component
- **What was wrong:** The `ollama-llm.yaml` component definition included a `- name: endpoint` / `value: "http://localhost:11434"` metadata entry.
- **What was changed:** Removed the `endpoint` metadata entry from the Ollama component YAML.
- **Why:** The `conversation.ollama` component only supports `model` and `responseCacheTTL` as metadata fields. There is no `endpoint` field. Ollama defaults to `localhost:11434`, which is what the blog intended, so removing the field has no functional impact. If a custom endpoint is needed, `conversation.openai` pointed at Ollama's OpenAI-compatible endpoint should be used instead.

## Review Notes
- The post uses the `v1.0-alpha1` API version. A newer `v1.0-alpha2` version exists with a substantially different request/response schema (nested `messages` arrays with role-typed objects like `ofUser`). The alpha1 version is still supported for backward compatibility but is deprecated. A future update to the post should consider migrating to the alpha2 API format.
- The response access pattern `response.json()['outputs'][0]['result']` is correct for the alpha1 API but would need to change to `response.json()['outputs'][0]['choices'][0]['message']['content']` if upgrading to alpha2.
- The `test_response_contains_json_when_requested` test assumes the LLM will return perfectly parseable JSON, which is inherently fragile even with `temperature: 0.0`. This is noted as a testing caveat, not a technical error.
- The Ollama model `llama3.2` is valid but the official docs show `llama3.2:latest` with the explicit tag. Both work since Ollama resolves untagged names to `:latest`.
