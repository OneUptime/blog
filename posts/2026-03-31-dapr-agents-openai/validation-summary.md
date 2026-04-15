# Validation Summary: How to Use Dapr Agents with OpenAI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents (dapr-agents Python package)
- OpenAI GPT-4o
- Dapr secret stores
- Dapr resiliency policies
- Python

## Sources Consulted
- Dapr Agents GitHub repository: https://github.com/dapr/dapr-agents
- Dapr Agents source code (`dapr_agents/llm/__init__.py`, `dapr_agents/llm/openai/chat.py`, `dapr_agents/llm/openai/client/base.py`, `dapr_agents/__init__.py`, `dapr_agents/agents/durable.py`)
- Dapr Agents Core Concepts documentation: https://docs.dapr.io/developing-ai/dapr-agents/dapr-agents-core-concepts/
- Dapr Agents Getting Started: https://docs.dapr.io/developing-ai/dapr-agents/dapr-agents-getting-started/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/

## Issues Found

1. **Wrong LLM class name (`OpenAIChat` -> `OpenAIChatClient`)**: The blog used `OpenAIChat` throughout, but the correct class exported by `dapr_agents.llm` is `OpenAIChatClient`. Fixed all six occurrences.

2. **Wrong constructor parameters for `OpenAIChatClient`**: The blog passed `temperature`, `max_tokens`, and `stream` as constructor parameters. These are actually parameters of the `generate()` method, not the constructor. The constructor accepts `model`, `api_key`, `timeout`, `base_url`, `organization`, and `project`. Removed `temperature` and `max_tokens` from the constructor call.

3. **Deprecated `Agent` class used instead of `DurableAgent`**: The blog imported and subclassed `Agent`, which is deprecated as of v1.0.0-rc.1. Replaced with `DurableAgent`, which is the current recommended class.

4. **Incorrect tool definition pattern**: The blog defined tools as `@tool`-decorated methods on an `Agent` subclass. In the actual API, tools are standalone functions decorated with `@tool` and passed to the `DurableAgent` constructor via the `tools` parameter. Rewrote the example to use standalone tool functions.

5. **Incorrect agent instantiation pattern**: The blog used class attribute-based configuration (`name`, `instructions` as class variables on a subclass). `DurableAgent` takes these as constructor parameters instead. Fixed to use constructor-based initialization.

6. **Non-existent `agent.run()` method**: `DurableAgent` does not have a `run()` method. It uses workflow-based execution via `start()`. Replaced `agent.run()` with `agent.start()`.

7. **Non-existent `agent.stream()` method**: The blog showed `agent.stream()` which does not exist. Streaming is supported at the LLM client level via the `stream` parameter on `generate()`. Rewrote the streaming section to use `llm.generate(stream=True)`.

8. **Non-existent `images` parameter on `agent.run()`**: The vision example used `agent.run("...", images=["screenshot.png"])` which is not a valid API. Rewrote to show the standard OpenAI multi-modal message format using `llm.generate()` directly.

9. **Wrong Dapr Python SDK import**: The blog used `from dapr import Client` but the correct import is `from dapr.clients import DaprClient`. Fixed the import and class instantiation.

## Review Notes
- The `openai` package is already a dependency of `dapr-agents` (specified as `openai>=1.75.0,<3.0.0` in pyproject.toml), so `pip install dapr-agents` alone is sufficient. The explicit `pip install dapr-agents openai` in the installation section is not wrong but is redundant. Left as-is since making the dependency explicit is reasonable for clarity.
- The Dapr component YAML for secret stores and resiliency policies is correct and follows the standard Dapr component specification format.
- The Dapr Agents framework uses a fundamentally different execution model (Dapr Workflows and actors) compared to the simple synchronous request-response pattern originally shown in the blog. The corrected examples better reflect the actual API surface.
