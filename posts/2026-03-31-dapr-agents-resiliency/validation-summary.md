# Validation Summary: How to Handle AI Agent Failures with Dapr Resiliency

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Resiliency (retry, circuit breaker, timeout policies)
- Dapr Agents SDK (`dapr-agents` Python package)
- Dapr Python SDK (`dapr` package for state management)
- OpenAI LLM integration via `OpenAIChatClient`
- Kubernetes (for applying resiliency resources)
- Dapr CLI (`dapr run`)

## Sources Consulted
- Dapr Resiliency policy spec and schema (docs.dapr.io resiliency overview and policy reference)
- Dapr resiliency Go source code (`pkg/apis/resiliency/v1alpha1/types.go`) for field name verification
- Dapr CLI reference documentation (flag definitions for `dapr run`)
- dapr-agents GitHub repository (github.com/dapr/dapr-agents) — `__init__.py` exports, `DurableAgent`, `OpenAIChatClient`, `AgentTool`, and `@tool` decorator source code
- Dapr Python SDK (github.com/dapr/python-sdk) — `DaprClient` and `get_state()` API

## Issues Found

### 1. Resiliency YAML: `maxDuration` field name incorrect
- **What was wrong:** The retry policy used `maxDuration: 120s` as a field name.
- **What was changed:** Corrected to `maxInterval: 120s`.
- **Why:** The Dapr resiliency spec defines `maxInterval` (not `maxDuration`) as the field that controls the maximum interval between retries for exponential back-off policies. Confirmed via the Go struct definition: `MaxInterval string json:"maxInterval"`.

### 2. Agent class name and pattern incorrect
- **What was wrong:** The post used `from dapr_agents import Agent` and subclassed `Agent` with class-level attributes (`name`, `instructions`).
- **What was changed:** Updated to use `DurableAgent` instantiation with constructor kwargs (`name`, `role`, `goal`, `instructions`, `llm`, `tools`), which is the correct dapr-agents SDK pattern.
- **Why:** The dapr-agents SDK exports `DurableAgent`, not `Agent`. Agents are created by instantiation, not subclassing. `instructions` is a list of strings, not a single string.

### 3. Tool decorator used on class methods instead of standalone functions
- **What was wrong:** `@tool` was applied to methods of a class (with `self` parameter).
- **What was changed:** Refactored tools to be standalone functions decorated with `@tool`, then passed to `DurableAgent` via the `tools` parameter.
- **Why:** The `@tool` decorator in dapr-agents is designed for standalone functions, which it wraps into `AgentTool` objects. Tools are passed to agents as a list at construction time.

### 4. LLM class name and non-existent parameters
- **What was wrong:** Used `OpenAIChat` with `max_retries` and `retry_on_status` parameters that do not exist in the SDK.
- **What was changed:** Corrected to `OpenAIChatClient` with only valid parameters (`model`, `timeout`). Added explanation that LLM retries are handled by Dapr resiliency policies, not client-side parameters.
- **Why:** The class is `OpenAIChatClient`, and it does not expose `max_retries` or `retry_on_status` fields. Retry logic for LLM calls is handled at the Dapr infrastructure level via the resiliency YAML configuration.

### 5. Non-existent `Agent.run()` method
- **What was wrong:** The circuit breaker section overrode a `run(self, message)` method that does not exist on the agent class.
- **What was changed:** Replaced with a standalone `@tool` function (`resilient_query`) that demonstrates circuit breaker fallback using Dapr service invocation, plus a `get_cached_response` helper using the Dapr state client.
- **Why:** `DurableAgent` has no `run()` method. Agent execution is handled externally via `AgentRunner`.

### 6. Dapr Python SDK import incorrect
- **What was wrong:** Used `from dapr import Client` and `Client().get_state(...)`.
- **What was changed:** Corrected to `from dapr.clients import DaprClient` with the proper context manager pattern (`with DaprClient() as client:`).
- **Why:** The Dapr Python SDK exports `DaprClient` from `dapr.clients`, not `Client` from `dapr`. The recommended usage pattern is with a context manager.

### 7. CLI command used wrong flags
- **What was wrong:** Used `--config ./resiliency-config.yaml` and `--components-path ./components` to load resiliency policies.
- **What was changed:** Replaced with `--resources-path ./components`. Removed the `--config` flag.
- **Why:** The `--config` flag is for Dapr configuration files (tracing, metrics, middleware), not resiliency specs. Resiliency YAML files are loaded from the resources directory via `--resources-path`. The `--components-path` flag is deprecated in favor of `--resources-path`.

## Review Notes
- The `matching` block in the retry policy (`httpStatusCodes`, `gRPCStatusCodes`) exists in the Dapr source code but is not prominently documented in the official docs. It works correctly but readers may not find it in standard documentation.
- The `trip: consecutiveFailures >= 5` expression uses valid CEL syntax but differs from the documented default pattern which uses `>` (strictly greater than). The `>=` variant trips on the 5th consecutive failure rather than after the 5th. This is a valid choice but worth noting.
- The Dapr metrics default port (9090) is correct.
- The overall resiliency YAML structure (apiVersion, kind, policies, targets) is correct and well-structured.
