# Validation Summary: How to Use Dapr Workflow for Saga Pattern Implementation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Python SDK, `dapr-ext-workflow` package)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Python
- Saga pattern for distributed transactions

## Sources Consulted
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk
- Official Dapr workflow examples: https://github.com/dapr/python-sdk/tree/main/examples/workflow
- Dapr Python SDK workflow extension documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Previously validated Dapr workflow posts in this blog (user-onboarding, task-chaining) for consistent API usage patterns

## Issues Found

1. **Missing `WorkflowRuntime` instance and workflow registration**: The workflow function was defined as a plain function without being registered on a `WorkflowRuntime` instance. In the Dapr Python SDK, workflows must be registered using the `@wfr.workflow(name=...)` decorator on a `WorkflowRuntime` instance. Added `wfr = wf.WorkflowRuntime()` and the `@wfr.workflow(name='order_saga_workflow')` decorator.

2. **Incorrect activity decorator `@wf.activity`**: The post used `@wf.activity` as a module-level decorator, which does not exist in the Dapr Python SDK. Activities must be registered on a `WorkflowRuntime` instance using `@wfr.activity(name='...')`. Fixed all four activity definitions to use the correct `@wfr.activity(name='...')` pattern.

3. **Missing activity context type annotation**: Activity functions had `ctx` as an untyped parameter. The correct type is `wf.WorkflowActivityContext`. Added proper type annotations to all activity function signatures.

4. **Missing `confirm_shipment` activity definition**: The workflow called `confirm_shipment` but the "Defining Activities" section did not include its definition. Added the missing `confirm_shipment` activity with the same pattern as the other activities.

5. **Incorrect workflow status REST API URL**: The curl command used `http://localhost:3500/v1.0/workflows/dapr/order_saga_workflow/ORD-123`, which incorrectly includes the workflow name in the path and uses the order ID as the instance ID. The correct Dapr workflow status API format is `GET /v1.0/workflows/{workflowComponent}/{instanceId}` — the workflow name is not part of the URL. Fixed to `http://localhost:3500/v1.0/workflows/dapr/<instance_id>`.

## Review Notes
- The post uses `DaprClient.start_workflow()` which is functional but the Dapr team recommends migrating to `DaprWorkflowClient` with `schedule_new_workflow()` in newer code. The current API still works but may be deprecated in a future release.
- The post does not show `wfr.start()` to start the workflow runtime, which would be needed in a complete application. This is acceptable for a tutorial showing code snippets.
- Since Dapr workflow activities have at-least-once execution semantics (not exactly-once), the saga compensation activities (release_inventory, refund_payment) should ideally be idempotent. The post could mention this as a best practice in a future update.
- The overall saga pattern design (sequential steps with compensation on failure) is correct and well-structured.
