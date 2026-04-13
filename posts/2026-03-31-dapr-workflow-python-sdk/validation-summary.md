# Validation Summary: How to Use Dapr Workflow with Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Workflow extension (`dapr-ext-workflow` Python package)
- Dapr Python SDK (`dapr` package)
- Python

## Sources Consulted
- Dapr Python SDK source code on GitHub: https://github.com/dapr/python-sdk/tree/main/ext/dapr-ext-workflow
- Dapr Python SDK workflow extension `__init__.py` exports
- Dapr Python SDK workflow examples: https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr Workflow Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr v1.15 release notes (deprecation of DaprClient workflow methods): https://blog.dapr.io/posts/2025/02/27/dapr-v1.15-is-now-available/

## Issues Found

1. **Wrong activity context type**: The post used `wf.ActivityContext` for activity function type hints, but this class is not exported from `dapr.ext.workflow`. The correct class is `wf.WorkflowActivityContext`. Fixed in both activity definitions.

2. **Non-existent `WorkflowActivityOptions` class**: The post wrapped `RetryPolicy` in `wf.WorkflowActivityOptions(retry_policy=...)` and passed it via an `options=` keyword argument to `call_activity()`. Neither `WorkflowActivityOptions` nor the `options` parameter exist. The correct approach is to pass `retry_policy=` directly to `ctx.call_activity()`. Fixed the retry example accordingly.

3. **Deprecated `DaprClient` workflow methods**: The post used `DaprClient.start_workflow()` and `DaprClient.get_workflow()`, which were deprecated in Dapr v1.15 (February 2025). Updated to use the current `DaprWorkflowClient` API with `schedule_new_workflow()` and `get_workflow_state()`. Also fixed the return value handling — `schedule_new_workflow()` returns a plain string instance ID, not an object with `.instance_id`.

4. **Minor text inaccuracy**: The introductory text said workflows use the `@wf.workflow` decorator, but the actual code uses `@wfr.workflow` (on the `WorkflowRuntime` instance). Fixed to match the code.

5. **Summary text**: Updated "DaprClient" reference to "DaprWorkflowClient" and removed mention of "activity options" (which don't exist as a separate concept) in the closing summary.

## Review Notes
- The `timedelta` import is not shown in the retry example. This is minor since the snippet is illustrative, but readers may need to add `from datetime import timedelta`.
- The post does not mention `wfr.shutdown()` for cleanly stopping the workflow runtime, which would be good practice in production code.
- The `dapr run` command shown is correct for local development.
