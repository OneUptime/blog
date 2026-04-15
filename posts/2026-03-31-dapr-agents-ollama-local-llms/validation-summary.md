# Validation Summary: How to Use Dapr Agents with Ollama for Local LLMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Agents Python SDK (`dapr-agents` v1.0.x)
- Ollama (local LLM inference server)
- OpenAI-compatible API (Ollama's `/v1` endpoint)
- Docker Compose (containerized deployment)
- Dapr CLI (`dapr run`)
- Python

## Sources Consulted
- Dapr Agents GitHub repository: https://github.com/dapr/dapr-agents
- Validated blog post: `posts/2026-03-31-dapr-agents-python-sdk/README.md` and its `validation-summary.md` (authoritative reference for correct `dapr-agents` SDK API patterns)
- Validated blog post: `posts/2026-03-31-dapr-agents-resiliency/validation-summary.md` (confirms `DurableAgent`, `OpenAIChatClient`, `@tool` standalone pattern, and `--resources-path` flag)
- Ollama official documentation and install page: https://ollama.com
- Ollama OpenAI-compatible API documentation: https://ollama.com/blog/openai-compatibility
- Docker Compose specification: https://docs.docker.com/compose/compose-file/

## Issues Found

### 1. Incorrect LLM client class name (`OpenAIChat` -> `OpenAIChatClient`)
- **What was wrong:** The post used `OpenAIChat` as the LLM client class name (e.g., `from dapr_agents.llm import OpenAIChat`).
- **What was changed:** Corrected to `OpenAIChatClient` throughout the post (import, instantiation, and summary section).
- **Why:** The `dapr-agents` SDK exports `OpenAIChatClient`, not `OpenAIChat`. Confirmed via the validated Python SDK post and resiliency post.

### 2. Incorrect agent class and pattern (`Agent` subclassing -> `DurableAgent` instantiation)
- **What was wrong:** The post used `from dapr_agents import Agent` and created agents by subclassing `Agent` with class-level attributes (`name`, `instructions` as a single string).
- **What was changed:** Replaced with `DurableAgent` constructor-based instantiation using `name`, `role`, `goal`, `instructions` (list of strings), `llm`, and `tools` parameters.
- **Why:** The `dapr-agents` SDK has no `Agent` class. The correct class is `DurableAgent`, and it uses constructor-based instantiation, not subclassing. The `instructions` parameter accepts a list of strings, not a single string.

### 3. `@tool` decorator used on class methods instead of standalone functions
- **What was wrong:** `@tool` was applied to methods of the `PrivateDocumentAgent` class (with `self` parameter).
- **What was changed:** Refactored all tools to standalone functions decorated with `@tool`, then passed to `DurableAgent` via the `tools` constructor parameter.
- **Why:** The `@tool` decorator in `dapr-agents` is designed for standalone functions. Tools are passed to agents as a list at construction time via `tools=[...]`.

### 4. Non-existent `agent.run()` method replaced with `AgentRunner`
- **What was wrong:** The post used `agent.run("...")` to execute the agent.
- **What was changed:** Replaced with `AgentRunner().serve(agent, port=8080)` pattern, which is the correct way to run a Dapr agent as an HTTP service.
- **Why:** `DurableAgent` has no `run()` method. Agent execution is handled by `AgentRunner`.

### 5. Deprecated `--components-path` CLI flag
- **What was wrong:** The startup script used `--components-path ./components`.
- **What was changed:** Corrected to `--resources-path ./components`.
- **Why:** The `--components-path` flag is deprecated in the Dapr CLI in favor of `--resources-path`.

## Review Notes
- The Ollama installation commands, API endpoint (`localhost:11434`), verify command (`/api/tags`), and OpenAI-compatible endpoint path (`/v1`) are all correct.
- The `api_key="ollama"` pattern for Ollama is correct — Ollama's OpenAI-compatible endpoint requires the header to be present but ignores the value.
- The Docker Compose configuration is functional. The `version: "3.8"` key is deprecated in modern Docker Compose (v2+) but still accepted and does not cause errors.
- The Modelfile syntax for configuring `num_ctx` is correct Ollama syntax.
- Model sizes in the comparison table are accurate: Phi-3 (3.8B), Llama 3.2 (3B default), Mistral (7B), Llama 3.1:70b (70B), CodeLlama (7B-34B range).
- The `extract_entities` tool function is a simplistic regex-based date finder, not a true NER implementation. This is fine for a demo but the function name slightly overpromises. Not changed as it's illustrative code.
