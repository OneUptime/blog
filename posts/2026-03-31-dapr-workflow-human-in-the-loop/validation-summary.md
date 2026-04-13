# Validation Summary: How to Use Dapr Workflow for Human-in-the-Loop Processes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK)
- durabletask-python (underlying framework)
- Python
- Flask
- Dapr HTTP API (workflow management)

## Sources Consulted
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Python SDK workflow extension docs: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk (specifically `ext/dapr-ext-workflow/dapr/ext/workflow/__init__.py` for module exports)
- durabletask-python source (`durabletask/task.py`, `durabletask/client.py`) for Task API and OrchestrationState fields
- Dapr workflow patterns documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr how-to author workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/

## Issues Found

1. **Incorrect activity decorator (`@wf.activity`)**: The `dapr.ext.workflow` module does not export an `activity` decorator. Activities must be registered via a `WorkflowRuntime` instance using `@wfr.activity(name='...')`. Fixed by adding `wfr = WorkflowRuntime()` and changing the decorator to `@wfr.activity(name='notify_approver')`.

2. **Incorrect REST API endpoint URL**: The blog used `GET /v1.0/workflows/dapr/expense_approval_workflow/{instance_id}`, which incorrectly included the workflow name in the path. The Dapr workflow HTTP API format is `GET /v1.0/workflows/{workflowComponentName}/{instanceId}` — no workflow name. Fixed to `GET /v1.0/workflows/dapr/{instance_id}`.

3. **Incorrect response field name for custom status**: The blog referenced `"serializedCustomStatus"` in the curl response, but the Dapr HTTP API returns custom status under `properties["dapr.workflow.custom_status"]`. Fixed the text to reference the correct field path.

## Review Notes
- The workflow function `expense_approval_workflow` is defined without a `@wfr.workflow` decorator, which would be needed in a real application. This is acceptable for a tutorial snippet focused on the workflow logic itself, but readers should be aware they need to register the workflow with a `WorkflowRuntime` instance.
- The `dapr.ext.workflow` module exports `WorkflowRuntime`, `DaprWorkflowContext`, `WorkflowActivityContext`, `when_any`, `when_all`, `RetryPolicy`, `WorkflowState`, `WorkflowStatus`, `DaprWorkflowClient`, `alternate_name`, and `TaskFailedError`. The blog's use of `wf.when_any()` is correct since `when_any` is a module-level export.
- The `Task.get_result()` method was verified as correct in the durabletask-python source code.
- The Dapr workflow HTTP API is marked as deprecated in favor of SDK-based management; the blog could note this in a future update.
