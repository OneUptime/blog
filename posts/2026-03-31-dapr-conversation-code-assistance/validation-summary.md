# Validation Summary: How to Use Dapr Conversation API for Code Assistance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Conversation API (alpha)
- Python / Flask
- Mistral (Codestral) via Dapr component
- OpenAI, Anthropic, Ollama referenced as alternative providers
- curl for HTTP testing

## Sources Consulted
- Validated sibling posts in this repo: `dapr-conversation-openai`, `dapr-conversation-ollama`, `dapr-conversation-hugging-face` — used to confirm canonical API field names and request format
- Dapr Conversation API specification — endpoint pattern `/v1.0-alpha1/conversation/{componentName}/converse`, request/response schema

## Issues Found
1. **Input field name `"message"` should be `"content"`** — The `call_code_llm` function used `{"message": ..., "role": ...}` for conversation inputs. All validated Dapr Conversation posts in this repo consistently use `"content"` as the field name (e.g., `{"content": "...", "role": "user"}`). Changed both occurrences (system and user inputs) from `"message"` to `"content"`.

2. **`generate_code` endpoint used wrong system prompt mode** — The `/api/code/generate` endpoint called `call_code_llm(prompt, "review")`, which would prepend the code review system prompt to a code generation request. This is a logic bug — the LLM would be instructed to review code instead of generating it. Added a `"generate"` system prompt and changed the mode to `"generate"`.

3. **`generate_tests` endpoint used wrong system prompt mode** — Same issue: the `/api/code/tests` endpoint called `call_code_llm(prompt, "review")`, applying the code review persona to test generation. Added a `"test"` system prompt and changed the mode to `"test"`.

## Review Notes
- The `parameters` field uses `max_tokens` (snake_case). This is provider-dependent — Mistral's API uses snake_case, so this is correct for the Codestral component referenced. Other providers (e.g., Anthropic) also use `max_tokens`.
- The `SYSTEM_PROMPTS` dict defines a `"refactor"` mode that is never used by any endpoint. This is not a bug but could be confusing — it may be intended for future use or as an example.
- The post's Flask app does not include Dapr component YAML configuration. Other posts in this series also omit this when focusing on the application code, so this is consistent with the series pattern.
