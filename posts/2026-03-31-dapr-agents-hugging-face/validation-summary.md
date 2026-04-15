# Validation Summary: How to Use Dapr Agents with Hugging Face Models

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents Python SDK (`dapr-agents`)
- Hugging Face Inference API (`huggingface_hub`)
- Hugging Face Transformers (`transformers`)
- Hugging Face Text Generation Inference (TGI)
- Dapr runtime
- Kubernetes (volume mounts for model caching)

## Sources Consulted
- dapr-agents PyPI package (https://pypi.org/project/dapr-agents/) — verified package name, version 1.0.1
- dapr-agents GitHub repository (https://github.com/dapr/dapr-agents) — verified class names, import paths, constructor parameters, and agent execution patterns by reading source code
- dapr-agents Python SDK blog post (validated sibling post in this repo) — cross-referenced correct API patterns for `DurableAgent`, `HFHubChatClient`, `OpenAIChatClient`, `AgentRunner`
- Hugging Face Hub documentation (https://huggingface.co/docs/hub/en/security-tokens) — verified token format (`hf_` prefix, not `hf-`)
- Hugging Face Hub CLI reference (https://huggingface.co/docs/huggingface_hub/en/package_reference/cli) — verified `huggingface-cli download --local-dir` syntax
- Hugging Face environment variables docs (https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables) — verified `HF_HOME` and `HF_TOKEN` env vars
- Hugging Face model hub (https://huggingface.co/distilbert-base-uncased-finetuned-sst-2-english) — verified sentiment model exists and is correct

## Issues Found

1. **Wrong class name `HuggingFaceChat`**: This class does not exist in `dapr-agents`. The correct class is `HFHubChatClient` (from `dapr_agents.llm`). Fixed all occurrences.

2. **Non-existent constructor parameters on `HFHubChatClient`**: The original code passed `provider`, `max_tokens`, and `temperature` as constructor arguments. These are not constructor parameters of `HFHubChatClient`. `provider` should be `hf_provider` if needed; `max_tokens` and `temperature` are passed to the `generate()` method, not the constructor. Removed these parameters from the constructor call.

3. **Wrong class name `Agent`**: The `dapr-agents` SDK does not export an `Agent` class. The correct class is `DurableAgent`. Fixed the import and usage.

4. **Incorrect subclassing pattern**: The original code defined a `SentimentAgent` class that subclassed `Agent` with class-level `name`/`instructions` fields and `@tool`-decorated methods. `DurableAgent` uses a constructor-based pattern — `name`, `role`, `goal`, `instructions`, `llm`, and `tools` are all passed to the constructor. The `@tool` decorator works on standalone functions, not class methods. Rewrote the agent section to use the correct constructor pattern with standalone tool functions.

5. **Non-existent `agent.run()` method**: `DurableAgent` does not have a `run()` method. Agents are executed via `AgentRunner` — either `runner.serve(agent, port=...)` for HTTP services or `await runner.run(agent, payload=...)` for programmatic execution. Replaced with the correct `AgentRunner` async pattern.

6. **Non-existent class `HuggingFaceLocalChat`**: This class does not exist anywhere in the `dapr-agents` codebase. The package does not depend on `transformers` or `torch` for local model loading. The `device`, `torch_dtype`, and `load_in_8bit` parameters were fabricated. Replaced the entire section with the correct approach: running Hugging Face's Text Generation Inference (TGI) server locally via Docker and connecting with `OpenAIChatClient`.

7. **Wrong class name `OpenAIChat`**: This class does not exist in `dapr-agents`. The correct class is `OpenAIChatClient`. Fixed the import and usage.

8. **Wrong HF token placeholder format**: The original used `hf-your-token` (hyphen). Hugging Face tokens use an underscore prefix: `hf_...`. Fixed all occurrences to `hf_your-token`.

## Review Notes
- The `huggingface-cli` command used in the download example is the legacy CLI name; the current name is `hf`. However, `huggingface-cli` still works (with a deprecation warning), so this was left as-is.
- The `transformers` package in the install command is only needed for the sentiment classification tool function (local pipeline), not for the main LLM client. This is technically correct as written since the tool does use it.
- The Kubernetes volume mount YAML snippet for caching is a partial pod spec (not a complete manifest), which is appropriate for a focused example.
