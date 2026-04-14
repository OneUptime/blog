# Validation Summary: How to Implement Long-Running Transaction Workflow with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (building block for orchestrating long-running processes)
- Dapr .NET SDK (C# workflow and activity authoring)
- Saga pattern for distributed transactions
- Dapr Workflow HTTP API (status monitoring)

## Sources Consulted
- Dapr Workflow Overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr .NET SDK Workflow Documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-workflow/
- How to: Author a Workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Workflow API Reference: https://docs.dapr.io/reference/api/workflow_api/
- How to: Manage Workflows: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr .NET SDK Examples (Workflow): https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow

## Issues Found

### 1. Non-existent `[DaprWorkflow]` and `[DaprWorkflowActivity]` attributes (HIGH)
**What was wrong:** The post decorated the workflow class with `[DaprWorkflow]` and the activity class with `[DaprWorkflowActivity]`. These attributes do not exist in the Dapr .NET SDK. Dapr uses a registration-based approach where workflows and activities are registered in `Program.cs` via `builder.Services.AddDaprWorkflow(options => { options.RegisterWorkflow<T>(); options.RegisterActivity<T>(); })`.
**What was changed:** Removed both attributes from the code examples.
**Why:** Using non-existent attributes would cause compilation errors and confuse readers about how Dapr workflow registration works.

### 2. Incorrect REST API endpoint for workflow status (MEDIUM)
**What was wrong:** The curl command used `http://localhost:3500/v1.0/workflows/dapr/order-saga-001/status` with a trailing `/status` path segment.
**What was changed:** Removed the `/status` suffix. The correct endpoint is `GET /v1.0/workflows/{workflowComponentName}/{instanceId}` — i.e., `http://localhost:3500/v1.0/workflows/dapr/order-saga-001`.
**Why:** The trailing `/status` is not part of the Dapr Workflow API and would return a 404 error.

### 3. Incorrect workflow status response JSON format (MEDIUM)
**What was wrong:** The example response showed `customStatus` as a top-level field and omitted `createdAt`, `lastUpdatedAt`, and `properties` fields. In the actual Dapr Workflow API response, custom status is nested under `properties` as `dapr.workflow.custom_status`.
**What was changed:** Updated the response JSON to include `createdAt`, `lastUpdatedAt`, and the `properties` object with `dapr.workflow.custom_status` properly nested.
**Why:** The incorrect response format would mislead readers who try to parse the actual API response programmatically.

## Review Notes
- The post does not show the workflow/activity registration code (`AddDaprWorkflow`). Since the `[DaprWorkflow]` attributes were removed, readers might not know how to register their workflows. A brief note or code snippet for registration in `Program.cs` would be a valuable addition in a future update.
- The Saga pattern implementation using a compensation stack is a well-known and correct approach. The use of `Stack<T>` to ensure LIFO compensation order is appropriate.
- The `WorkflowContext.CallActivityAsync` method signature with `nameof()` for type-safe activity references is correct and follows Dapr best practices.
- The idempotency section is technically sound and provides good practical guidance.
- The `context.SetCustomStatus()` usage is correct for tracking workflow progress.
