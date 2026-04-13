# Validation Summary: How to Use Dapr Workflow for User Onboarding Flows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK, `dapr-ext-workflow` package)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Python
- Flask (for the email verification endpoint)

## Sources Consulted
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk
- Official Dapr workflow examples (`examples/workflow/simple.py`, `examples/workflow/human_approval.py`): https://github.com/dapr/python-sdk/tree/main/examples/workflow
- Dapr Python SDK workflow extension documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python SDK source code for `dapr.ext.workflow` module (`WorkflowRuntime`, `DaprWorkflowContext`, `WorkflowActivityContext`)

## Issues Found

1. **Missing `WorkflowRuntime` instance and workflow registration**: The main workflow function was defined as a plain function without being registered on a `WorkflowRuntime` instance. In the Dapr Python SDK, workflows must be registered using the `@wfr.workflow(name=...)` decorator on a `WorkflowRuntime` instance. Added `wfr = wf.WorkflowRuntime()` and the `@wfr.workflow(name='user_onboarding_workflow')` decorator to the workflow code block.

2. **Incorrect activity decorator `@wf.activity`**: The post used `@wf.activity` as a module-level decorator, which does not exist in the Dapr Python SDK. Activities must be registered on a `WorkflowRuntime` instance using `@wfr.activity(name='...')`. Fixed both activity definitions (`create_user_account` and `send_getting_started_guide`) to use the correct `@wfr.activity(name='...')` pattern.

3. **Missing activity context type annotation**: Activity functions had `ctx` as an untyped parameter. The correct type is `wf.WorkflowActivityContext`. Added proper type annotations to both activity function signatures.

## Review Notes
- The post uses `DaprClient` (from `dapr.clients`) for `start_workflow` and `raise_workflow_event`. While this API is functional and the usage shown is correct (with `workflow_component="dapr"`, `event_data=` keyword, etc.), the Dapr team recommends migrating to `DaprWorkflowClient` (from `dapr.ext.workflow`) which uses `schedule_new_workflow` instead of `start_workflow` and `data=` instead of `event_data=`. The `DaprClient` workflow methods may be deprecated in a future release. This was not changed since the current API still works, but it may need updating in the future.
- The workflow context methods (`set_custom_status`, `call_activity`, `wait_for_external_event`, `create_timer`, `instance_id`) and the `wf.when_any` function are all used correctly with proper signatures.
- The `when_any` return value comparison pattern (`winner == timeout`) is correct — `when_any` yields the winning `Task` object itself.
- The post does not show `wfr.start()` to start the workflow runtime, which would be needed in a complete application, but this is acceptable for a tutorial showing code snippets rather than a full runnable application.
