# Validation Summary: How to Use Dapr Agents with Anthropic Claude

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Agents (dapr-agents Python SDK)
- Anthropic Claude (LLM)
- Dapr Conversation API
- Dapr Secret Stores
- Python

## Sources Consulted
- dapr-agents GitHub repository (https://github.com/dapr/dapr-agents) — examined source code at v1.0.1, including `dapr_agents/llm/__init__.py`, `dapr_agents/__init__.py`, `dapr_agents/tool/base.py`, and `dapr_agents/agents/base.py`
- Dapr local file secret store documentation (https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/)
- Dapr Python SDK documentation (https://docs.dapr.io/developing-applications/sdks/python/python-client/)
- Dapr CLI reference for `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)
- Anthropic model deprecations documentation (https://docs.anthropic.com/en/docs/resources/model-deprecations)
- Anthropic extended thinking documentation (https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)

## Issues Found

### 1. `AnthropicChat` class does not exist (Critical)
**What was wrong:** The entire post was built around `from dapr_agents.llm import AnthropicChat`, a class that does not exist in the dapr-agents SDK. The SDK provides `DaprChatClient`, `OpenAIChatClient`, `HFHubChatClient`, `NVIDIAChatClient`, and others — but no `AnthropicChat`.
**What was changed:** Replaced all `AnthropicChat` usage with the correct `DaprChatClient` class backed by a `conversation.anthropic` Dapr component configured in YAML.
**Why:** The correct integration path for Anthropic Claude in Dapr Agents is through Dapr's Conversation API abstraction, not a direct provider client.

### 2. `Agent` base class and subclassing pattern are fabricated (Critical)
**What was wrong:** The post used `from dapr_agents import Agent, tool` and showed subclassing `Agent` with class-level `name`/`instructions` attributes and `@tool`-decorated instance methods. None of this exists — the SDK exports `DurableAgent` (not `Agent`), which is instantiated with constructor parameters, not subclassed.
**What was changed:** Replaced `Agent` subclassing with `DurableAgent` instantiation using constructor params (`name`, `role`, `instructions`, `tools`, `llm`).
**Why:** `DurableAgent` is the correct agent class in dapr-agents.

### 3. `@tool` decorator used incorrectly on instance methods (Critical)
**What was wrong:** Tools were defined as `@tool`-decorated instance methods on an Agent subclass (e.g., `def load_csv(self, filepath: str)`).
**What was changed:** Tools are now standalone functions decorated with `@tool`, passed to `DurableAgent` via the `tools` parameter.
**Why:** The `@tool` decorator in dapr-agents is designed for standalone functions, which are then passed as a list to the agent constructor.

### 4. `agent.run()` method does not exist (Critical)
**What was wrong:** The post called `agent.run("Analyze the sales data...")` directly on the agent instance. `DurableAgent` does not have a `.run()` method.
**What was changed:** Replaced with `AgentRunner().serve(agent, port=8080)` which serves the agent via HTTP, consistent with the `dapr run` command shown later.
**Why:** Agents in dapr-agents are run through `AgentRunner`, not through a direct `.run()` method.

### 5. Retired model IDs (Major)
**What was wrong:** The post used `claude-3-5-sonnet-20241022` and `claude-3-7-sonnet-20250219`, both of which were retired in October 2025 and now return API errors.
**What was changed:** Updated all model references to `claude-sonnet-4-20250514`.
**Why:** The old model IDs are no longer functional. Readers following the tutorial would encounter errors.

### 6. `pip install anthropic` is unnecessary (Minor)
**What was wrong:** Installation command was `pip install dapr-agents anthropic`. The `anthropic` package is not a dependency and is not used by the SDK since integration is through Dapr's Conversation API.
**What was changed:** Simplified to `pip install dapr-agents`.
**Why:** Installing `anthropic` alongside `dapr-agents` serves no purpose for the Dapr Agents integration pattern.

### 7. Dapr Python client import was incorrect (Minor)
**What was wrong:** Used `from dapr import Client` and `client = Client()`.
**What was changed:** Fixed to `from dapr.clients import DaprClient` and `with DaprClient() as client:`.
**Why:** The correct class is `DaprClient` in the `dapr.clients` module, not `Client` in `dapr`.

### 8. `--components-path` flag is deprecated (Minor)
**What was wrong:** The `dapr run` command used `--components-path ./components`.
**What was changed:** Updated to `--resources-path ./components`.
**Why:** `--components-path` has been deprecated in the Dapr CLI in favor of `--resources-path`.

### 9. Extended thinking section was misleading (Moderate)
**What was wrong:** Showed extended thinking configured through the non-existent `AnthropicChat` class. Extended thinking is a provider-specific Anthropic API feature not available through Dapr's Conversation API abstraction.
**What was changed:** Updated to show extended thinking via the `anthropic` Python SDK directly, with a note that it's not configurable through Dapr's Conversation API.
**Why:** Technical accuracy — extended thinking requires direct Anthropic API access.

### 10. Secret store integration pattern updated (Minor)
**What was wrong:** Showed loading secrets in Python and passing to the non-existent `AnthropicChat` constructor.
**What was changed:** Updated to show the Dapr-idiomatic pattern of referencing secrets via `secretKeyRef` in the component YAML, plus the corrected Python SDK usage as an alternative.
**Why:** Since the API key is configured in the Dapr component YAML (not Python), the secret reference belongs in the YAML configuration.

## Review Notes
- The `instructions` parameter on `DurableAgent` expects an iterable of strings (list), not a single multi-line string. The corrected post uses a list of strings.
- The dapr-agents SDK (v1.0.1) supports OpenAI, HuggingFace Hub, NVIDIA, and Dapr Conversation API as LLM backends. Anthropic support is through the Dapr Conversation API abstraction layer.
- The `conversation.anthropic` Dapr component type should be verified against the specific Dapr version being used, as Conversation API components may vary between Dapr releases.
- The 200K token context window claim is accurate for the Claude models referenced and remains true for current Claude models.
