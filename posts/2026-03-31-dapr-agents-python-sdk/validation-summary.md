# Validation Summary: How to Use Dapr Agents Python SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Agents Python SDK (`dapr-agents` v1.0.x)
- Dapr runtime (sidecar, state stores, pub/sub, Conversation API)
- Python
- OpenAI, HuggingFace Hub, NVIDIA, Ollama (LLM providers)

## Sources Consulted
- PyPI package page: https://pypi.org/project/dapr-agents/
- Dapr Agents GitHub repository: https://github.com/dapr/dapr-agents
- Source code inspection of `dapr_agents` package modules (`agents`, `llm`, `memory`, `tool`, `workflow`)

## Issues Found

1. **Incorrect agent class name**: Blog used `Agent` but the actual class is `DurableAgent` (from `dapr_agents`). There is no `Agent` class exported by the SDK. Fixed all references.

2. **Wrong agent configuration pattern**: Blog showed a subclassing pattern with class-level attributes (`name`, `description`, `instructions`, `max_iterations`). The actual API uses constructor-based instantiation of `DurableAgent` with parameters like `name`, `role`, `goal`, and `instructions`. The `description` parameter does not exist; replaced with `role` and `goal`. `instructions` accepts a list of strings, not a single string. `max_iterations` is configured via `AgentExecutionConfig`, not as a direct attribute. Fixed all examples.

3. **Fabricated pip install extras**: Blog listed `dapr-agents[openai]`, `dapr-agents[anthropic]`, `dapr-agents[mistral]`, and `dapr-agents[all]`. None of these extras exist. The only optional extra is `dapr-agents[vectorstore]`. OpenAI and HuggingFace Hub are core dependencies. Fixed installation section.

4. **Incorrect `@tool` decorator usage**: Blog showed `@tool` as a method decorator on Agent subclass methods (with `self` parameter). The actual `@tool` decorator is a standalone function decorator — tools are plain functions, not methods. Tools are then passed to `DurableAgent` via the `tools` constructor parameter. Fixed all tool examples and added the `tools=[...]` constructor pattern.

5. **Fabricated LLM client classes**: Blog listed `OpenAIChat`, `AnthropicChat`, `MistralChat`, `AWSBedrockChat`, and `HuggingFaceChat`. The actual classes are `OpenAIChatClient`, `HFHubChatClient`, `DaprChatClient`, and `NVIDIAChatClient`. There are no Anthropic, Mistral, or AWS Bedrock client classes — those providers are accessed through the vendor-neutral `DaprChatClient` (Dapr Conversation API). Fixed all LLM client names and examples.

6. **Incorrect memory class names and parameters**: Blog used `InMemoryMemory` and `DaprStateMemory` with parameters `session_id` and `max_history`. The actual classes are `ConversationListMemory` and `ConversationDaprStateMemory`. The `ConversationDaprStateMemory` constructor takes `store_name` and `agent_name`, not `session_id` or `max_history`. Fixed class names and constructor usage.

7. **Non-existent `AgentService` class**: Blog used `AgentService` with `port` and `health_path` parameters and a `.start()` method. The actual class is `AgentRunner` with a `.serve(agent, port=...)` method. There is no `health_path` parameter. Fixed service setup example.

8. **Non-existent `agent.run_async()` method**: Blog showed `agent.run_async("...")` as a method on the agent instance. This method does not exist. Async execution uses `await runner.run(agent, payload=...)` on `AgentRunner`. Fixed async example.

9. **Incorrect HTTP invocation path**: Blog used `/v1.0/invoke/my-agent/method/run`. The default entry path exposed by `AgentRunner.serve()` is `/agent/run`, making the correct URL `/v1.0/invoke/my-agent/method/agent/run`. Fixed curl example.

10. **Incorrect feature list in introduction**: The bullet points listed `Agent` base class and `AgentService`, as well as claiming support for Anthropic, Mistral, and Bedrock as direct LLM wrappers. Corrected to `DurableAgent`, `AgentRunner`, and the actual provider list.

## Review Notes
- The Dapr Agents Python SDK is relatively new (v1.0.x) and the API may evolve. The corrected examples reflect the SDK as of v1.0.1.
- The `DaprChatClient` uses the Dapr Conversation API, which requires configuring a Dapr component YAML file to point to the desired LLM backend. This is a different pattern from direct client libraries and may warrant additional explanation in a future update.
- The memory configuration on `DurableAgent` may use an `AgentMemoryConfig` wrapper in some versions; the corrected post shows the simplified direct assignment pattern.
- The `@tool` decorator requires functions to have docstrings — this is enforced at decoration time. The corrected examples retain docstrings.
