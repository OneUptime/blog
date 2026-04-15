# Validation Summary: How to Use Dapr Agents for Autonomous Task Execution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents (dapr-agents Python SDK)
- Dapr State Store
- Dapr Pub/Sub
- OpenAI GPT-4o (via Dapr Agents LLM client)
- FastAPI (background tasks)
- Tavily Search API
- httpx (HTTP client)
- Python 3.11+

## Sources Consulted
- dapr-agents PyPI package (v1.0.1) — https://pypi.org/project/dapr-agents/
- dapr-agents GitHub repository — https://github.com/dapr/dapr-agents
- dapr-agents source code (`__init__.py`, `DurableAgent`, `AgentRunner`, `AgentExecutionConfig`, `tool` decorator)
- Dapr Python SDK documentation — https://docs.dapr.io/developing-applications/sdks/python/
- Tavily API documentation — https://docs.tavily.com/
- httpx documentation — https://www.python-httpx.org/

## Issues Found

1. **Wrong agent class name**: `from dapr_agents import Agent` does not exist. Changed to `from dapr_agents import DurableAgent`. The SDK exports `DurableAgent` as the main agent class.

2. **Wrong LLM class name**: `from dapr_agents.llm import OpenAIChat` does not exist. Changed to `from dapr_agents import OpenAIChatClient`, which is the correct exported class name.

3. **Wrong Dapr client import**: `from dapr import Client` is non-standard. Changed to `from dapr.clients import DaprClient`, which is the standard import in the Dapr Python SDK.

4. **Subclassing pattern is incorrect**: The blog used `class AutonomousResearchAgent(Agent)` with class attributes (`name`, `instructions`, `max_iterations`) and `@tool`-decorated methods. The dapr-agents SDK does not support this pattern. Agents are created via constructor kwargs on `DurableAgent(...)`, and tools are standalone `@tool`-decorated functions passed via the `tools=` list parameter. Rewrote the entire agent definition to use the correct functional pattern.

5. **`instructions` type**: Was a single multi-line string. Changed to a list of strings, which is the expected type for `DurableAgent`.

6. **`max_iterations` configuration**: Was set as a class attribute. Changed to use `execution=AgentExecutionConfig(max_iterations=20)`, which is the correct API.

7. **`agent.run()` does not exist**: The blog called `agent.run(prompt)` directly. Changed to use `AgentRunner` with `await runner.run(agent, payload={"task": prompt})`, which is the correct execution pattern. Also added `runner.shutdown(agent)` cleanup in a `finally` block.

8. **Tavily API uses POST, not GET**: The blog used `httpx.get()` for the Tavily search endpoint. Tavily's search API requires a POST request. Changed to `httpx.post()`.

9. **DaprClient used without context manager**: All `Client()` calls were bare instantiations. Changed to use `with DaprClient() as client:` context manager pattern, which is the recommended practice for proper resource cleanup.

10. **`save_finding` tool relied on internal state hack**: The original used `getattr(self, "_current_task_id", "default")` to access a dynamically-set private attribute. Changed to accept `task_id` as an explicit function parameter, which the LLM can extract from the prompt context. This is cleaner and works with the standalone function pattern.

11. **Safety controls section used inheritance**: The original subclassed `AutonomousResearchAgent` and used `super().web_search()`. Rewrote to use a wrapper tool function (`safe_web_search`) and a new `DurableAgent` instance with restricted tools and lower `max_iterations`.

## Review Notes
- The Tavily API key is hardcoded as a placeholder string `"your-tavily-key"` — this is acceptable for a tutorial but could benefit from a note about using environment variables in production.
- The blog creates a new `DaprClient()` instance per tool call. For high-throughput scenarios, a shared client would be more efficient, but for a tutorial this is fine.
- The `AgentRunner.run()` method is async, so the `run_autonomous_task` function correctly uses `async def` and `await`.
