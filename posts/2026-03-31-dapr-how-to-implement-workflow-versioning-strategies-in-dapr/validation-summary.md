# Validation Summary: How to Implement Workflow Versioning Strategies in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Workflow (durable execution / workflow orchestration)
- Dapr .NET SDK (`Dapr.Workflow` package)
- C# / .NET (workflow and activity authoring)
- Dapr HTTP API (workflow management endpoints)
- Bash scripting (drain workflow script)

## Sources Consulted
- Dapr Workflow API Reference — https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow Features and Concepts — https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/
- Dapr .NET SDK source (Workflow.cs, WorkflowContext.cs, DaprWorkflowClient.cs) — https://github.com/dapr/dotnet-sdk
- How to: Author a Workflow — https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- How to: Manage Workflows — https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr runtime source code (workflow HTTP routes) — https://github.com/dapr/dapr
- Dapr v1.15 release notes (workflow API stabilization)

## Issues Found

### 1. Deprecated API version prefix (`v1.0-alpha1`)
All HTTP API examples used the deprecated `v1.0-alpha1` prefix. Since Dapr v1.15, the stable version is `v1.0`. Updated all endpoint URLs to use `v1.0`.

### 2. Non-existent query endpoint
The drain script and monitoring section used a fabricated endpoint `POST /v1.0-alpha1/workflows/dapr/OrderWorkflowV1/query` with a filter body for bulk-querying workflow instances by status. This endpoint does not exist in Dapr's HTTP API. Replaced with guidance to track instance IDs in the application's own database and query individual instances by ID using the actual GET endpoint.

### 3. Incorrect URL pattern for GET workflow status
The post used `GET /v1.0-alpha1/workflows/dapr/OrderWorkflowV1/{instanceId}`, which incorrectly includes the workflow name in the path. The actual endpoint is `GET /v1.0/workflows/dapr/{instanceId}` — only the workflow component name and instance ID are in the path, not the workflow class name. Fixed.

### 4. Incorrect URL pattern for terminate endpoint
Same issue as above — the post used `POST /v1.0-alpha1/workflows/dapr/OrderWorkflowV1/{instanceId}/terminate`. The correct endpoint is `POST /v1.0/workflows/dapr/{instanceId}/terminate`. Fixed.

## Review Notes
- The .NET SDK code examples (Workflow base class, CallActivityAsync, CurrentUtcDateTime, ScheduleNewWorkflowAsync, AddDaprWorkflow registration) are all correct and match the current Dapr .NET SDK API.
- The conceptual explanation of the non-determinism problem with workflow replay is accurate and well-explained.
- The three versioning strategies (conditional branching, side-by-side classes, drain-before-deploy) are sound architectural patterns consistent with guidance from similar durable execution frameworks (Temporal, Azure Durable Functions).
- The note about using `context.CurrentUtcDateTime` instead of `DateTime.UtcNow` is correct and an important best practice.
- Dapr's lack of a bulk-query HTTP API for workflow instances is a real limitation that users should be aware of when implementing the drain strategy.
