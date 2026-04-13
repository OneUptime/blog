# Validation Summary: How to Implement Workflow Activities in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Workflow API (durabletask-go)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Go programming language

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (workflow examples and client package)
- Dapr durabletask-go source code: https://github.com/dapr/durabletask-go (workflow package — ActivityContext, WorkflowContext, Registry, option functions)
- Dapr Go workflow documentation: https://docs.dapr.io/developing-applications/sdks/go/go-workflow/

## Issues Found

1. **Unused `"context"` import in activity code block**: The first code block (Defining an Activity) imported `"context"` but never used it. In Go, unused imports are compilation errors. Removed the unused import.

2. **Wrong import path for workflow package**: All code blocks used `"github.com/dapr/go-sdk/workflow"` but the workflow types (`ActivityContext`, `WorkflowContext`, `Registry`, option functions) are in `"github.com/dapr/durabletask-go/workflow"`. Changed the import path throughout.

3. **Incorrect activity input option function name**: The post used `workflow.ActivityInput()` to pass input to activities. The correct function name is `workflow.WithActivityInput()`. Fixed in both occurrences within the workflow function.

4. **Incorrect text reference to `workflow.CallActivity()`**: The section heading text said "Use `workflow.CallActivity()`" but `CallActivity` is a method on `*WorkflowContext`, not a standalone package function. Changed to "Use `ctx.CallActivity()`".

5. **Completely fabricated worker creation/registration pattern**: The post used `workflow.NewWorker()`, `w.RegisterWorkflow()`, `w.RegisterActivity()`, `w.Start()`, and `w.Shutdown()` — none of these exist in the Dapr Go SDK. The correct pattern is:
   - `workflow.NewRegistry()` to create a task registry
   - `r.AddWorkflow()` and `r.AddActivity()` for registration
   - `client.NewWorkflowClient()` to create a workflow client
   - `wc.StartWorker(ctx, r)` to start the worker
   Rewrote the entire registration section with correct API calls.

6. **Incorrect workflow client creation**: The post used `workflow.NewClient(workflow.WithDaprClient(c))` which doesn't exist. The correct approach is `client.NewWorkflowClient()` from `github.com/dapr/go-sdk/client`. Fixed in the triggering section.

7. **Wrong scheduling method name**: The post used `ScheduleNewWorkflow()` but the correct method is `ScheduleWorkflow()`. Fixed in the triggering section.

## Review Notes
- The activity function signature (`func(ctx workflow.ActivityContext) (any, error)`) and workflow function signature (`func(ctx *workflow.WorkflowContext) (any, error)`) were correct.
- `ctx.GetInput()`, `ctx.CallActivity()`, `.Await()`, and `workflow.WithInput()` were all correct.
- The conceptual explanations of workflow activities and their role are accurate.
- The `go get github.com/dapr/go-sdk` install command is correct but users will also need `go get github.com/dapr/durabletask-go` for the workflow types — this is typically pulled in transitively as a dependency.
