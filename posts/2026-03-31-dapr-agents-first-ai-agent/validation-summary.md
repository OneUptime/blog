# Validation Summary: How to Build Your First AI Agent with Dapr Agents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents Python SDK (dapr-agents v1.0.1)
- Dapr runtime and CLI
- OpenAI GPT-4o (via OpenAIChatClient)
- Python 3.11+
- Redis (as Dapr state store)

## Sources Consulted
- Dapr Agents PyPI page: https://pypi.org/project/dapr-agents/ (confirmed v1.0.1, released 2026-04-14)
- Dapr Agents GitHub repository: https://github.com/dapr/dapr-agents
- Dapr Agents Getting Started docs: https://docs.dapr.io/developing-ai/dapr-agents/dapr-agents-getting-started/
- Dapr Agents Core Concepts docs: https://docs.dapr.io/developing-ai/dapr-agents/dapr-agents-core-concepts/
- Dapr Agents Quickstarts: https://github.com/dapr/dapr-agents/tree/main/quickstarts

## Issues Found

1. **Wrong agent class name**: Post used `Agent` (deprecated) instead of `DurableAgent`. Fixed import to `from dapr_agents import DurableAgent, tool`.

2. **Wrong LLM client class and import path**: Post used `from dapr_agents.llm import OpenAIChat`. The correct class is `OpenAIChatClient` at `from dapr_agents.agents.llm import OpenAIChatClient`. Also removed explicit `api_key` parameter (picked up from environment automatically).

3. **Incorrect agent definition pattern**: Post defined the agent as a class with class attributes (`name`, `instructions`) and `@tool`-decorated methods. The actual API uses constructor-based instantiation with `DurableAgent(name=..., role=..., goal=..., instructions=[...], tools=[...], llm=...)`. Tools are standalone functions passed via the `tools` parameter.

4. **Tools defined as class methods instead of standalone functions**: The `@tool` decorator is used on standalone functions, not on class methods with `self`. Removed `self` parameter from all tool definitions and moved them outside any class.

5. **Missing required `role` and `goal` parameters**: `DurableAgent` requires `role` and `goal` constructor parameters that were not present in the original.

6. **`instructions` should be a list of strings**: Post used a single multi-line string; the API expects a list of strings.

7. **`agent.run(question)` does not exist**: The correct pattern is `AgentRunner().serve(agent, port=8001)` to serve the agent as an HTTP service, then invoke via POST to `/agent/run`.

8. **Wrong app port in `dapr run`**: Changed `--app-port 8080` to `--app-port 8001` to match the `AgentRunner.serve()` port.

9. **Interactive CLI pattern replaced with HTTP invocation**: The original showed an interactive `input()` prompt, but `DurableAgent` runs as an HTTP service. Replaced with `curl` commands showing the POST `/agent/run` and GET `/agent/instances/{WORKFLOW_ID}` pattern.

10. **`ConversationHistory` class does not exist**: Removed the non-existent import.

11. **`DaprStateMemory` is not a real class**: Replaced with the correct `ConversationDaprStateMemory` from `dapr_agents.memory`, wrapped in `AgentMemoryConfig` from `dapr_agents.agents.configs`. Updated constructor parameters (`store_name`, `session_id`).

12. **`AgentService` class does not exist**: Replaced with explanation that the agent is already served via `AgentRunner`, and showed Dapr sidecar invocation as an alternative.

13. **Wrong HTTP endpoint path**: Original used `/v1.0/invoke/weather-agent/method/run`. Corrected to `/v1.0/invoke/weather-agent/method/agent/run` for Dapr sidecar invocation.

14. **Error handling tool had `self` parameter**: Removed `self` from the standalone `@tool` function in the error handling section.

## Review Notes
- The `@tool` decorator in official docs is shown with `@tool(args_model=Schema)` using an explicit Pydantic schema. It likely also works without `args_model` for simple type-annotated functions, but the official examples always include a schema. For a beginner tutorial the simpler form is appropriate.
- The Dapr state store component YAML is standard Dapr configuration and is correct.
- The `pip install dapr-agents openai` command works, though `openai` may be pulled in as a dependency of `dapr-agents` already.
- Python >=3.11 and <3.14 is required per the PyPI page.
