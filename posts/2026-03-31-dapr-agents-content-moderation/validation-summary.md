# Validation Summary: How to Use Dapr Agents for Content Moderation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents (`dapr-agents` Python SDK)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Dapr state store and pub/sub components
- FastAPI with BackgroundTasks
- OpenAI GPT-4o / GPT-4o-mini
- Python regex (`re` module)

## Sources Consulted
- Dapr Agents Python SDK — verified API patterns against sibling blog posts in this repo (getting-started, first-ai-agent, python-sdk, openai, anthropic-claude, autonomous-tasks) which collectively establish the canonical import paths and class names
- Dapr Python SDK (`dapr-python`) — verified `DaprClient` class name and import path (`from dapr.clients import DaprClient`), `save_state()` and `publish_event()` method signatures
- FastAPI documentation — verified `BackgroundTasks.add_task()` usage with async functions
- Python `datetime` module documentation — verified `datetime.utcnow()` deprecation status (deprecated since Python 3.12)

## Issues Found
1. **Wrong LLM class name (`OpenAIChat` → `OpenAIChatClient`)**: The post used `from dapr_agents.llm import OpenAIChat` and `OpenAIChat(model=...)`. The correct class name in the `dapr-agents` SDK is `OpenAIChatClient`. Fixed in all three occurrences (classification agent import, pipeline endpoint import, and both instantiation sites).

2. **Wrong Dapr client import and class name (`from dapr import Client` → `from dapr.clients import DaprClient`)**: The Dapr Python SDK exports `DaprClient`, not `Client`, and the standard import path is `from dapr.clients import DaprClient`. Fixed in three locations: pre-screening agent top-level import, `save_decision` method, and `route_for_human_review` method.

3. **Missing `await` on async `agent.run()` calls**: The `Agent.run()` method in `dapr-agents` is an async coroutine (confirmed by other posts using `asyncio.run(agent.run(...))`). The post called it without `await` inside async FastAPI handlers, which would return a coroutine object instead of the result. Added `await` to `prescreening_agent.run(...)` in the `/moderate` endpoint and `agent.run(...)` in the `deep_classify` function.

4. **Missing `import json` in `route_for_human_review`**: The method used `json.dumps()` but did not import `json`. The `save_decision` method correctly imported `json` locally, but `route_for_human_review` did not. Added `import json` inside the method.

5. **Deprecated `datetime.utcnow()`**: Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` and updated the import to include `timezone`. `datetime.utcnow()` has been deprecated since Python 3.12.

## Review Notes
- The `dapr run` CLI commands look correct for running Dapr sidecars alongside uvicorn-served FastAPI apps.
- The comment "Run pre-screening synchronously (fast)" is now slightly misleading since we added `await` — it's still awaited within the request (not pushed to background), but the wording "synchronously" in an async context may confuse readers. Left as-is since the intent (blocking before responding) is clear from context.
- The post creates new `DaprClient()` instances inside tool methods without using context managers. In production, it would be better to use `with DaprClient() as client:` or maintain a shared client, but this is acceptable for a tutorial.
