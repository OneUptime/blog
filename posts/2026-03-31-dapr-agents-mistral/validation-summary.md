# Validation Summary: How to Use Dapr Agents with Mistral

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Agents Python SDK (`dapr-agents` v1.0.x)
- Dapr Conversation API (`conversation.mistral` component)
- Dapr runtime (sidecar, components)
- Mistral AI (Mistral Large, Mistral Small)
- Python
- vLLM / Ollama (self-hosted inference)

## Sources Consulted
- Dapr Agents GitHub repository: https://github.com/dapr/dapr-agents
- Dapr Agents PyPI package: https://pypi.org/project/dapr-agents/
- Dapr Agents source code inspection (`dapr_agents.llm`, `dapr_agents.agents`, `dapr_agents.tool`)
- Validated sibling post: `posts/2026-03-31-dapr-agents-python-sdk/` (canonical API reference)
- Validated sibling post: `posts/2026-03-31-dapr-agents-openai/` (correct `OpenAIChatClient` / `DurableAgent` patterns)
- Mistral AI API documentation: https://docs.mistral.ai/
- Mistral function calling documentation: https://docs.mistral.ai/capabilities/function_calling/

## Issues Found

1. **Fabricated `MistralChat` class**: The blog used `from dapr_agents.llm import MistralChat` throughout. This class does not exist in the dapr-agents SDK. There is no dedicated Mistral client — Mistral is accessed through `DaprChatClient` via the Dapr Conversation API (`conversation.mistral` component). Replaced all `MistralChat` usage with `DaprChatClient(component_name="llm-mistral")` and added the required Dapr component YAML configuration.

2. **Non-existent `Agent` base class**: The blog used `from dapr_agents import Agent` and a class-based subclassing pattern (e.g., `class CodeGenAgent(Agent)`). The actual class is `DurableAgent`, instantiated via constructor — not subclassed. Replaced all occurrences with `DurableAgent`.

3. **Incorrect `@tool` decorator usage**: The blog used `@tool` as a method decorator on Agent subclass methods (with `self` parameter). The actual `@tool` decorator is a standalone function decorator — tools are plain functions, not methods. Tools are passed to `DurableAgent` via the `tools` constructor parameter. Converted all class-method tools to standalone functions and passed them via `tools=[...]`.

4. **Incorrect `instructions` format**: The blog used `instructions` as a multi-line string class attribute. The actual API accepts `instructions` as a list of strings in the `DurableAgent` constructor. Fixed all instruction definitions.

5. **Unnecessary `mistralai` pip install**: The blog instructed `pip install dapr-agents mistralai`. Since Mistral is accessed through the Dapr Conversation API (not a direct Python client), the `mistralai` package is not needed. Simplified to `pip install dapr-agents`.

6. **Missing Dapr component configuration**: The blog had no Dapr component YAML for Mistral, which is required when using `DaprChatClient`. Added a `components/llm-mistral.yaml` example with `conversation.mistral` type.

7. **Incorrect self-hosted pattern**: The blog used `MistralChat(base_url=...)` for self-hosted Mistral via vLLM/Ollama. Since vLLM and Ollama expose OpenAI-compatible APIs, the correct client is `OpenAIChatClient` with a `base_url` parameter. Fixed the self-hosted section.

8. **Misleading section title "Mistral Le Chat / Self-Hosted"**: Le Chat is Mistral's consumer chat product, not a self-hosting option. Renamed section to "Using Self-Hosted Mistral".

9. **Deprecated `mistral-medium-latest` model**: The blog listed `mistral-medium-latest` as an available model. Mistral deprecated the medium tier. Removed it from the available models list, keeping `mistral-small-latest` and `mistral-large-latest`.

10. **Missing `agent.start()` calls**: The blog used `agent.run("...")` which is not the standard invocation pattern. Agents are started with `agent.start()` and receive work via the Dapr sidecar. Fixed agent invocation.

## Review Notes
- The Dapr Conversation API component type `conversation.mistral` requires the Dapr sidecar to be running. The component YAML shown assumes a basic setup; production deployments should use Dapr secret store references for the API key rather than hardcoding it.
- Mistral's `-latest` model aliases (e.g., `mistral-large-latest`) resolve to the most recent version of that model tier. For reproducibility in production, consider using versioned model names (e.g., `mistral-large-2` or specific dated versions).
- The `langdetect` library used in the multilingual example is a third-party dependency that would need separate installation (`pip install langdetect`).
- The Dapr Agents SDK is relatively new (v1.0.x) and the API may evolve. The corrected examples reflect the SDK as of v1.0.1.
