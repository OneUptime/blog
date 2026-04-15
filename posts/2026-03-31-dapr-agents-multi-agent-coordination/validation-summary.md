# Validation Summary: How to Use Dapr Agents for Multi-Agent Coordination

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents Python SDK (dapr-agents)
- Dapr Pub/Sub (Redis)
- Dapr State Store (Redis)
- Dapr Distributed Tracing (Zipkin)
- Dapr Workflows
- OpenAI LLM integration
- Python

## Sources Consulted
- Dapr Agents GitHub repository (github.com/dapr/dapr-agents) — source code, `__init__.py` exports, quickstart examples
- Dapr Agents SDK `DurableAgent` class constructor signature and configuration dataclasses
- Dapr Agents SDK `AgentRunner` class and its `serve()`, `subscribe()`, `run()` methods
- Dapr Agents SDK `@tool` decorator and `AgentTool` class
- Dapr Agents SDK orchestration modes (`OrchestrationMode.AGENT`, `ROUNDROBIN`, `RANDOM`)
- Dapr Agents SDK `call_agent` workflow composition API
- Dapr component specification docs for pub/sub and state store YAML configuration
- Dapr CLI documentation for `dapr run` command flags

## Issues Found

### 1. Non-existent `Agent` class used throughout
**What was wrong:** All code examples imported and subclassed `from dapr_agents import Agent`. The `Agent` class does not exist in the dapr-agents SDK.
**What was changed:** Replaced with `DurableAgent`, the actual agent class in the SDK, instantiated with constructor parameters.

### 2. Non-existent `DaprPubSubMessenger` class and `dapr_agents.messaging` module
**What was wrong:** The research agent imported `from dapr_agents.messaging import DaprPubSubMessenger`. Neither this class nor the `dapr_agents.messaging` module exist.
**What was changed:** Replaced with `AgentPubSubConfig` from `dapr_agents.agents.configs`, which is the correct way to configure pub/sub for agents.

### 3. Agents defined via subclassing instead of instantiation
**What was wrong:** All three agents (research, writer, coordinator) were defined by subclassing `Agent` with class-level attributes (`name`, `instructions`, `messenger`). The dapr-agents SDK uses instantiation with constructor keyword arguments, not subclassing.
**What was changed:** Rewrote all agent definitions to use `DurableAgent(name=..., role=..., instructions=[...], ...)` instantiation pattern.

### 4. Tools defined as class methods instead of standalone functions
**What was wrong:** Tools like `search_web`, `format_content`, `delegate_research` were defined as instance methods on agent subclasses. In dapr-agents, `@tool` decorates standalone functions which are then passed to the agent via the `tools` parameter.
**What was changed:** Extracted all tools as standalone `@tool`-decorated functions and passed them to agents via `tools=[...]`.

### 5. Non-existent `agent.run()` method
**What was wrong:** The research agent called `self.run(task["query"])` — `DurableAgent` does not have a `.run()` method.
**What was changed:** Removed the manual `handle_task`/`run` pattern. Agents are served via `AgentRunner.serve()` which handles incoming tasks automatically.

### 6. Coordinator used raw Dapr pub/sub instead of orchestration
**What was wrong:** The coordinator agent manually published events using `dapr.Client().publish_event()` to route tasks. In dapr-agents, multi-agent coordination uses the orchestrator pattern with `OrchestrationMode.AGENT`, shared registries, or `call_agent` workflow composition.
**What was changed:** Replaced with an orchestrator `DurableAgent` using `AgentExecutionConfig(orchestration_mode=OrchestrationMode.AGENT)` and a shared `AgentRegistryConfig` with `team_name`.

### 7. Incorrect subscription pattern
**What was wrong:** Used `dapr.ext.grpc.App` with `@app.subscribe()` for subscribing to topics. While this is valid standard Dapr Python SDK, dapr-agents handles subscriptions through `AgentRunner.serve()`.
**What was changed:** Replaced the subscription section with an alternative workflow composition approach using `call_agent`, which is a more useful pattern to demonstrate alongside the orchestrator approach.

### 8. Missing state store component
**What was wrong:** Agents require a state store for workflow state and registry, but no state store component YAML was provided.
**What was changed:** Added a `statestore.yaml` component configuration for Redis state store.

### 9. Description mentioned "actor model"
**What was wrong:** The post description referenced "Dapr's actor model" for coordination. Dapr Agents uses Dapr Workflows (not the actor model directly) for agent orchestration.
**What was changed:** Updated description to reference "workflow orchestration" instead.

### 10. `format` parameter name shadows Python built-in
**What was wrong:** The `format_content` tool used `format` as a parameter name, which shadows Python's built-in `format()` function.
**What was changed:** Renamed the parameter to `style`.

## Review Notes
- The Dapr YAML component configurations (pub/sub, tracing) were correct in the original post and required no changes.
- The `dapr run` CLI commands were correct and required no changes.
- The dapr-agents SDK is relatively new and evolving. Import paths for configuration classes like `AgentStateConfig` and `AgentRegistryConfig` may change between versions. Readers should consult the latest SDK documentation.
- The post's overall architectural concept (coordinator + specialist agents communicating via Dapr) is sound — the issues were entirely in the API usage details.
