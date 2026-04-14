# Validation Summary: How to Migrate from Temporal to Dapr Workflow

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Temporal (Go SDK) - workflow orchestration engine
- Dapr Workflow (Go SDK via durabletask-go) - sidecar-based workflow engine
- Go programming language

## Sources Consulted
- Dapr durabletask-go source code: https://github.com/dapr/durabletask-go (workflow/workflow.go, workflow/activity.go, workflow/client.go, workflow/registry.go)
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (client/client.go, examples/workflow/main.go)
- Dapr Workflow documentation: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Temporal Go SDK source code: https://github.com/temporalio/sdk-go (workflow/workflow.go, temporal/retry_policy.go)
- Temporal Go SDK documentation: https://docs.temporal.io/develop/go/
- Temporal versioning documentation: https://docs.temporal.io/develop/go/versioning
- Temporal signal documentation: https://docs.temporal.io/develop/go/message-passing

## Issues Found

1. **Concept mapping table used .NET naming instead of Go**: `context.CallActivityAsync` and `context.WaitForExternalEventAsync` are .NET SDK names. Changed to `ctx.CallActivity` and `ctx.WaitForExternalEvent` to match the Go SDK used in all code examples.

2. **Concept mapping table said "class" instead of "function"**: Dapr column said "Workflow class" and "Activity class", but Go has no classes. Changed to "Workflow function" and "Activity function" to match Go conventions and the actual SDK API.

3. **Missing `temporal` package import in Temporal code**: The code used `temporal.RetryPolicy` but only imported `go.temporal.io/sdk/workflow`. Added the missing `go.temporal.io/sdk/temporal` import.

4. **Compensation activity not awaited in Temporal code**: `workflow.ExecuteActivity(ctx, activities.ReleaseInventory, input.OrderId)` was fire-and-forget (no `.Get()` call). This is a Temporal anti-pattern — the workflow could complete before the compensation finishes. Added `.Get(ctx, nil)` to await completion.

5. **Wrong function name `workflow.ActivityInput`**: The Dapr Go SDK uses `workflow.WithActivityInput(input)` (with the `With` prefix), not `workflow.ActivityInput(input)`. Fixed all three occurrences.

6. **Wrong import path for Dapr workflow package**: `github.com/dapr/go-sdk/workflow` does not exist. The workflow types (WorkflowContext, ActivityContext, etc.) come from `github.com/dapr/durabletask-go/workflow`. Fixed the import.

7. **Non-existent worker API**: `workflow.NewWorker()`, `w.RegisterWorkflow()`, and `w.RegisterActivity()` do not exist in the Dapr Go SDK. Replaced with the correct API: `workflow.NewRegistry()` with `r.AddWorkflow()`/`r.AddActivity()`, then `client.NewWorkflowClient()` with `wfClient.StartWorker(ctx, registry)`.

8. **Deprecated/incorrect StartWorkflow API**: `daprClient.StartWorkflow()` with `StartWorkflowRequest` struct does not exist in the current API. Replaced with the correct pattern: `client.NewWorkflowClient()` followed by `wfClient.ScheduleWorkflow()` with functional options (`workflow.WithInstanceID`, `workflow.WithInput`).

## Review Notes
- The Dapr Go SDK workflow API is built on top of the `durabletask-go` library. The import path distinction (`dapr/durabletask-go/workflow` vs `dapr/go-sdk/client`) is important and may confuse newcomers.
- The Dapr compensation activity call on line 94 (`ctx.CallActivity(ReleaseInventoryActivity, ...)` without `.Await(nil)`) mirrors the same fire-and-forget pattern that was fixed in the Temporal example. However, in the Dapr durabletask-go model, activities scheduled within a workflow are durably tracked, so this is less problematic than in Temporal. A future improvement could add `.Await(nil)` for consistency.
- Temporal also supports Cassandra as a persistence backend, not just PostgreSQL and MySQL. The post's claim is not wrong but is incomplete — this is a minor simplification acceptable for a migration guide.
