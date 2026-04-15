# Validation Summary: How to Use Dapr Agents for Document Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents Python SDK (`dapr-agents`)
- Dapr Python SDK (`dapr`)
- Dapr pub/sub and state store building blocks
- FastAPI with Dapr extension (`dapr-ext-fastapi`)
- pdfplumber for PDF text extraction
- OpenAI GPT-4o (via `OpenAIChatClient`)

## Sources Consulted
- dapr-agents GitHub repository: https://github.com/dapr/dapr-agents — `__init__.py`, `tool/base.py`, `llm/openai/chat.py`, quickstart examples
- dapr-agents PyPI: https://pypi.org/project/dapr-agents/
- Dapr Agents Core Concepts: https://docs.dapr.io/developing-ai/dapr-agents/dapr-agents-core-concepts/
- Dapr Agents Getting Started: https://docs.dapr.io/developing-ai/dapr-agents/dapr-agents-getting-started/
- Dapr Python SDK GitHub: https://github.com/dapr/python-sdk — `dapr/clients/__init__.py`, `dapr/clients/grpc/client.py`
- Dapr Python SDK Client Docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr FastAPI Extension Docs: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-fastapi/
- dapr-ext-fastapi source: https://github.com/dapr/python-sdk/blob/master/ext/dapr-ext-fastapi/dapr/ext/fastapi/app.py

## Issues Found

### 1. Deprecated `Agent` class replaced with `DurableAgent`
- **What was wrong:** The post imported and subclassed `Agent` from `dapr_agents`. The `Agent` class is deprecated as of dapr-agents v1.0. The current canonical class is `DurableAgent`.
- **What was changed:** Replaced `from dapr_agents import Agent, tool` with `from dapr_agents import DurableAgent, tool, OpenAIChatClient` and changed agent creation to use `DurableAgent(...)` constructor.
- **Why:** `DurableAgent` is the current, supported agent class in dapr-agents v1.0+.

### 2. Incorrect agent definition pattern (subclassing with class attributes)
- **What was wrong:** The post defined agents by subclassing `Agent` with class-level `name` and `instructions` attributes. `DurableAgent` does not support this pattern — it uses constructor parameters instead.
- **What was changed:** Converted from subclass pattern to direct instantiation: `DurableAgent(name=..., instructions=[...], tools=[...], llm=...)`.
- **Why:** The dapr-agents SDK expects agents to be configured via constructor parameters, not class-level attributes on subclasses.

### 3. `@tool` decorator used on instance methods instead of standalone functions
- **What was wrong:** The `@tool` decorator was applied to `self`-accepting instance methods on Agent subclasses. The `@tool` decorator wraps standalone functions and returns `AgentTool` instances — it is not designed for instance methods.
- **What was changed:** Converted all `@tool`-decorated methods to standalone functions (removed `self` parameter) and passed them to the agent via the `tools=[...]` constructor parameter.
- **Why:** The `@tool` decorator in dapr-agents only works on standalone functions, which are then passed to the agent's `tools` parameter.

### 4. Wrong Dapr client import
- **What was wrong:** `from dapr import Client` — this import does not exist. The Dapr Python SDK exports the client from `dapr.clients`.
- **What was changed:** Changed to `from dapr.clients import DaprClient`.
- **Why:** The correct import path is `dapr.clients.DaprClient`, not `dapr.Client`.

### 5. DaprClient not used as context manager
- **What was wrong:** `Client()` was called inline without a context manager, creating a new client for each operation. The `DaprClient` should be used as a context manager for proper resource management.
- **What was changed:** Wrapped `DaprClient()` usage in `with DaprClient() as client:` blocks.
- **Why:** The Dapr Python SDK recommends using `DaprClient` as a context manager to ensure proper gRPC channel cleanup.

### 6. `OpenAIChat` class does not exist
- **What was wrong:** The subscribe handler used `OpenAIChat(model="gpt-4o")`. This class does not exist in dapr-agents.
- **What was changed:** Replaced with `OpenAIChatClient(model="gpt-4o")` throughout the post.
- **Why:** The correct class name in dapr-agents is `OpenAIChatClient`, exported from `dapr_agents.llm.openai`.

### 7. Incorrect event data access in FastAPI subscribe handler
- **What was wrong:** `event.Data()` was used to access event data in a FastAPI subscribe handler. The `.Data()` method is a gRPC-style API; in FastAPI, event data is received as a function parameter.
- **What was changed:** Changed handler signature to `async def process_invoice(event_data=Body())` and accessed data via `event_data.get("data", "{}")`.
- **Why:** The Dapr FastAPI extension injects the CloudEvent payload as a function parameter, not as a method on an event object.

### 8. Incorrect agent invocation pattern
- **What was wrong:** `agent.run(prompt)` was used to invoke the agent. In the current SDK, agents are run via `AgentRunner` or triggered remotely via `trigger_agent`.
- **What was changed:** Replaced with `trigger_agent(agent_name=..., input=..., app_id=...)` to trigger the invoice extraction agent running as a separate Dapr service.
- **Why:** `DurableAgent` instances are not invoked directly with `.run()`. The `trigger_agent` function is the correct way to trigger an agent running in another Dapr sidecar.

## Review Notes
- The `DaprChatClient` (using the Dapr Conversation API) is the recommended LLM client in dapr-agents, as it decouples the agent from a specific LLM provider. `OpenAIChatClient` works but ties the code directly to OpenAI. Future posts could show the `DaprChatClient` approach.
- The `pdfplumber` usage is correct and idiomatic.
- The Dapr CLI commands in the "Running Document Processing" section are correct.
- The overall architecture (intake → extraction → validation → routing via pub/sub) is a sound pattern for document processing with Dapr.
