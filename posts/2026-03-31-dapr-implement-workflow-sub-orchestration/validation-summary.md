# Validation Summary: How to Implement Workflow Sub-Orchestration in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Go SDK)
- Dapr workflow sub-orchestration / child workflows
- Dapr HTTP API for workflow management
- Go programming language

## Sources Consulted
- Dapr Go SDK workflow package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr durabletask-go workflow package documentation: https://pkg.go.dev/github.com/dapr/durabletask-go/workflow
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api
- Dapr How to: Author a workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Workflow overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Go SDK workflow examples: https://github.com/dapr/go-sdk/tree/main/examples/workflow

## Issues Found

### Issue 1: Incorrect option function name `WithChildWorkflowInstanceID`
- **What was wrong:** The blog used `workflow.WithChildWorkflowInstanceID()` (with `With` prefix) in two places, but the imported package `github.com/dapr/go-sdk/workflow` exposes this function as `workflow.ChildWorkflowInstanceID()` (without the `With` prefix). The `With`-prefixed variant belongs to the newer `github.com/dapr/durabletask-go/workflow` package which is not imported. This would cause a compilation error.
- **What was changed:** Renamed `workflow.WithChildWorkflowInstanceID` to `workflow.ChildWorkflowInstanceID` in both occurrences (payment and inventory sub-orchestration calls).
- **Why:** The function name must match the imported package's exported API.

### Issue 2: Incorrect HTTP API endpoint for workflow status
- **What was wrong:** The monitoring section used `/v1.0/workflows/dapr/<instanceId>/status` with a `/status` suffix that does not exist in the Dapr workflow HTTP API.
- **What was changed:** Removed the `/status` suffix from both curl commands, making them `GET /v1.0/workflows/dapr/<instanceId>`.
- **Why:** The correct Dapr workflow status endpoint is `GET /v1.0/workflows/dapr/<instanceId>` per the official API reference.

## Review Notes
- The blog imports `github.com/dapr/go-sdk/workflow`, which is functional but has been superseded by `github.com/dapr/durabletask-go/workflow`. The newer package uses different naming conventions (e.g., `WithActivityInput` instead of `ActivityInput`, `WithChildWorkflowInput` instead of `ChildWorkflowInput`) and a different worker creation pattern (`workflow.NewRegistry()` + `r.AddWorkflow()` instead of `workflow.NewWorker()` + `w.RegisterWorkflow()`). The code as written is correct for the imported package, but a future update to the recommended package may be warranted.
- The Dapr workflow HTTP API (`/v1.0/workflows/...`) is itself deprecated in favor of the gRPC-based SDK APIs, though the endpoint format used in the post (after the fix) is correct.
- The `RecordTransaction` activity call in the child workflow does not await its result, making it fire-and-forget. This is valid in the Durable Task Framework but means errors from that activity will be silently ignored.
