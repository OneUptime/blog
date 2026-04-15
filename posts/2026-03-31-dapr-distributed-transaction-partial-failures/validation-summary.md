# Validation Summary: How to Handle Partial Failures in Dapr Distributed Transactions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Workflow (durable workflow engine)
- Dapr State Management API
- Dapr Python SDK (`dapr-ext-workflow`, `dapr-client`)
- Dapr Workflow HTTP API
- Python (generator-based workflow orchestration)

## Sources Consulted
- Dapr Workflow API Reference — https://docs.dapr.io/reference/api/workflow_api
- Dapr Python Workflow SDK Docs — https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Python SDK workflow example — https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py
- Dapr runtime workflow HTTP handler (Go source) — https://github.com/dapr/dapr/blob/master/pkg/api/http/workflow.go
- Dapr workflow protobuf definition — https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/workflow.proto
- Dapr Python SDK DaprWorkflowContext source — https://github.com/dapr/python-sdk/blob/master/ext/dapr-ext-workflow/dapr/ext/workflow/dapr_workflow_context.py
- Dapr Python SDK state store example — https://github.com/dapr/python-sdk/blob/main/examples/state_store/state_store.py
- Dapr How-To: Manage Workflows — https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/

## Issues Found

### Issue 1: Incorrect HTTP API path for querying workflow status
- **What was wrong:** The GET endpoint used `/v1.0/workflows/dapr/order_fulfillment_workflow/instances/INSTANCE_ID`, which includes a `{workflowName}` segment and an `/instances/` prefix that do not exist in the actual API.
- **What was changed:** Corrected to `/v1.0/workflows/dapr/INSTANCE_ID`. The Dapr Workflow GET API path is `GET /v1.0/workflows/{workflowComponent}/{instanceID}` — no workflow name or `/instances/` segment.
- **Why:** Verified against the Dapr runtime HTTP route definitions in `pkg/api/http/workflow.go` and the official Workflow API reference docs.

### Issue 2: Incorrect HTTP API path for terminating a workflow
- **What was wrong:** The POST terminate endpoint used `/v1.0/workflows/dapr/order_fulfillment_workflow/instances/INSTANCE_ID/terminate`, with the same extraneous `{workflowName}` and `/instances/` segments.
- **What was changed:** Corrected to `/v1.0/workflows/dapr/INSTANCE_ID/terminate`. The Dapr Workflow terminate API path is `POST /v1.0/workflows/{workflowComponent}/{instanceID}/terminate`.
- **Why:** Same source verification as Issue 1.

### Issue 3: Incorrect workflow GET response JSON schema
- **What was wrong:** The example response showed a `failureDetails` object with `errorType` and `message` fields. This does not match the actual Dapr Workflow HTTP API response schema, which uses a `properties` map for failure information.
- **What was changed:** Replaced with the correct response format including `instanceID`, `workflowName`, `createdAt`, `lastUpdatedAt`, `runtimeStatus`, and `properties` fields. Failure details use keys `dapr.workflow.failure.error_type` and `dapr.workflow.failure.error_message` inside the `properties` map.
- **Why:** Verified against the Dapr Workflow protobuf definition (`GetWorkflowResponse` in `dapr/proto/runtime/v1/workflow.proto`) and the HTTP API reference docs.

## Review Notes
- All Python SDK usage is correct: `dapr.ext.workflow` import path, `DaprWorkflowContext` class, `ctx.call_activity()` with `input=` keyword argument, `ctx.instance_id` property, `wf.when_all()`, and generator-style `yield` syntax.
- The `DaprClient` state management calls (`get_state`, `save_state`) use correct parameter names (`store_name`, `key`, `value`).
- The workflow start API path (`POST /v1.0/workflows/dapr/{workflowName}/start`) was correct as written.
- The post's use of `/v1.0/` (stable API) rather than `/v1.0-alpha1/` is correct — the Dapr runtime supports both, with alpha1 being deprecated.
- The Python SDK's `WorkflowState` class does expose failure info via a `failure_details` attribute, but that is the SDK-level abstraction, not the raw HTTP response. Since the blog shows `curl` commands, the HTTP response format is what matters.
