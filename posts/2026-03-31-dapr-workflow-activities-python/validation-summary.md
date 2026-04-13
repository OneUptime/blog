# Validation Summary: How to Implement Workflow Activities in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr` package)
- Dapr Workflow Extension for Python (`dapr-ext-workflow` package)
- Python dataclasses
- httpx HTTP client
- pytest / unittest.mock for testing

## Sources Consulted
- Dapr Python SDK source code on GitHub (https://github.com/dapr/python-sdk)
- `dapr-ext-workflow` package source: `WorkflowRuntime`, `DaprWorkflowClient`, `DaprWorkflowContext`, `WorkflowActivityContext` class definitions
- PyPI listing for `dapr-ext-workflow` (https://pypi.org/project/dapr-ext-workflow/)
- Dapr official workflow documentation (https://docs.dapr.io/developing-applications/building-blocks/workflow/)
- Dapr Python SDK examples (`workflow/simple.py`)

## Issues Found

### 1. `DaprWorkflowClient` used as a context manager (incorrect)
- **What was wrong:** The "Starting a Workflow from Client Code" section used `with DaprWorkflowClient() as client:`, implying `DaprWorkflowClient` is a context manager. It is not — it does not implement `__enter__`/`__exit__`. Only the general-purpose `DaprClient` supports context manager usage.
- **What was changed:** Replaced the `with` statement with direct instantiation: `client = DaprWorkflowClient()`.
- **Why:** Using a `with` statement on `DaprWorkflowClient` would raise an `AttributeError` at runtime.

### 2. Overview mentions standalone `@activity` decorator (inaccurate)
- **What was wrong:** The overview stated activities are "decorated with the `@activity` decorator." There is no standalone `@activity` decorator in the Dapr Python SDK. The decorator form is `@wfr.activity` where `wfr` is a `WorkflowRuntime` instance.
- **What was changed:** Reworded to reference `register_activity` calls and the `@wfr.activity` decorator on a runtime instance.
- **Why:** The original phrasing could mislead readers into looking for a non-existent standalone decorator import.

## Review Notes
- The `wait_for_workflow_completion` method's `instance_id` parameter is positional in the SDK source, though using it as a keyword argument (as shown in the post) still works in Python. This is not an error but worth noting.
- The post correctly separates concerns: `DaprClient` (from `dapr.clients`) is used for state and pub/sub operations inside activities, while `DaprWorkflowClient` is used for workflow management. This is the correct pattern.
- The `yield ctx.call_activity(...)` generator-based workflow pattern, `runtime.register_workflow`/`runtime.register_activity` registration, and `runtime.shutdown()` call are all accurate per the SDK source.
- The testing pattern with a mock `WorkflowActivityContext` is a valid approach since activities are plain functions.
