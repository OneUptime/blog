# Validation Summary: How to Use Durable Execution for AI Workflows in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflows (durable execution engine)
- dapr-ext-workflow Python SDK
- dapr-agents Python SDK (LLM client)
- Redis (state store for workflow durability)
- OpenAI GPT-4o (via dapr-agents)
- Dapr CLI

## Sources Consulted
- dapr-ext-workflow Python SDK source code (installed package and GitHub: https://github.com/dapr/python-sdk)
- dapr-agents Python SDK source code (GitHub: https://github.com/dapr/dapr-agents, PyPI v1.0.1)
- Dapr Workflow Python SDK API: `WorkflowRuntime`, `DaprWorkflowContext`, `WorkflowActivityContext`, `RetryPolicy` classes
- Dapr component specs for Redis state store (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr Workflow overview (https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/)

## Issues Found

### 1. Wrong class name: `OpenAIChat` → `OpenAIChatClient`
The blog used `from dapr_agents.llm import OpenAIChat`. The correct class name in the dapr-agents SDK is `OpenAIChatClient`. Fixed the import to `from dapr_agents import OpenAIChatClient` and updated both usages in activity functions.

### 2. Wrong method name: `.complete()` → `.generate()`
The blog called `llm.complete(...)` on the OpenAI client. The correct method in dapr-agents is `.generate()`. Fixed both occurrences.

### 3. Wrong response attribute: `response.text` → `response.get_message().content`
The blog accessed `response.text` on the LLM response. The `.generate()` method returns an `LLMChatResponse` object. To get the text content, the correct call is `response.get_message().content`. Fixed both occurrences.

### 4. Non-existent `WorkflowActivityOptions` wrapper in retry policy
The blog wrapped the retry policy in `wf.WorkflowActivityOptions(retry_policy=wf.RetryPolicy(...))`. The class `WorkflowActivityOptions` does not exist in `dapr.ext.workflow`. The `call_activity` method's `retry_policy` parameter accepts a `RetryPolicy` instance directly. Fixed to pass `wf.RetryPolicy(...)` directly.

### 5. Missing `timedelta` import in retry policy section
The retry policy code used `timedelta(seconds=5)` without importing it. Added `from datetime import timedelta` to the code block.

## Review Notes
- The blog uses `DaprClient.start_workflow()` and `DaprClient.get_workflow()` which are deprecated in favor of `DaprWorkflowClient.schedule_new_workflow()` and `DaprWorkflowClient.get_workflow_state()`. The deprecated methods still work, but new code should prefer `DaprWorkflowClient`. This was not changed because the deprecated API is still functional and the fix would require significant restructuring of the "Starting a Durable Workflow" section.
- The Redis state store YAML component configuration is correct, including the critical `actorStateStore: "true"` metadata field required for Dapr Workflows.
- The `WorkflowRuntime`, `@wfr.workflow`, `@wfr.activity` decorator patterns, `DaprWorkflowContext.call_activity` method signature (with `input` keyword argument), and `WorkflowActivityContext` usage are all correct.
- The explanation of durable execution replay semantics (completed steps replayed from history, not re-executed) is accurate.
- The `dapr run` CLI command and flags are correct.
