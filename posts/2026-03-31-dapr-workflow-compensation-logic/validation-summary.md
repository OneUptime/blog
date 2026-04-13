# Validation Summary: How to Implement Compensation Logic with Dapr Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (durable workflow engine)
- Dapr Workflow Python SDK (`dapr-ext-workflow`)
- Dapr Workflow REST API
- Saga compensation pattern for distributed transactions

## Sources Consulted
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow Python SDK Extension: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Workflow Patterns (including saga/compensation): https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr Workflow Overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr How to Author a Workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr How to Manage Workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Python SDK GitHub Repository: https://github.com/dapr/python-sdk

## Issues Found

### 1. Incorrect GET workflow status endpoint URL
- **What was wrong:** The blog used `GET /v1.0/workflows/dapr/travel_booking_workflow/instances/INSTANCE_ID`, which includes the workflow name and an `/instances/` path segment that does not exist in the Dapr Workflow API.
- **What was changed:** Corrected to `GET /v1.0/workflows/dapr/INSTANCE_ID`. The Dapr Workflow API retrieves workflow status by instance ID alone, with the path format `/v1.0/workflows/<workflowComponent>/<instanceId>`.
- **Why:** The original URL would return a 404 or routing error. The correct endpoint only requires the workflow component name (`dapr`) and the instance ID.

### 2. Incorrect workflow status response format
- **What was wrong:** The response JSON showed `serializedOutput` as a top-level field. The actual Dapr Workflow API returns workflow output inside a nested `properties` object under the key `dapr.workflow.output`. The response was also missing standard fields like `createdAt`, `lastUpdatedAt`, and the `properties` object.
- **What was changed:** Updated the response JSON to match the actual Dapr Workflow API response format, including `createdAt`, `lastUpdatedAt`, and the `properties` object containing `dapr.workflow.custom_status`, `dapr.workflow.input`, and `dapr.workflow.output`.
- **Why:** Developers relying on `serializedOutput` as a top-level field would fail to parse the workflow output correctly.

## Review Notes
- The Python SDK code is correct: `dapr.ext.workflow` is the right import, `DaprWorkflowContext` with `call_activity(func, input=...)` and `yield` syntax is accurate, `WorkflowActivityContext` is the correct activity context class, and `WorkflowRuntime` with `register_workflow`/`register_activity`/`start` methods matches the current SDK API.
- The POST start workflow endpoint (`/v1.0/workflows/dapr/{workflowName}/start`) is correct.
- The `compensate_steps` activity directly calls `cancel_flight`, `cancel_hotel`, and `refund_payment` as regular functions rather than scheduling them as separate workflow activities. This is a valid approach within a single activity, though for maximum durability each compensation could be its own activity invoked via `call_activity`. This is a design choice, not an error.
- The `input` parameter name in `compensate_steps` shadows the Python built-in `input()` function. This is a minor style issue, not a bug, and was left as-is to preserve the author's code.
