# Validation Summary: How to Use Dapr Workflow with Go SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow building block
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Durable Task Go SDK (`github.com/dapr/durabletask-go`)
- Go programming language

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (workflow client API, examples)
- Dapr Durable Task Go SDK source code: https://github.com/dapr/durabletask-go (workflow/activity type definitions, registry API)
- Dapr Go SDK workflow examples: `examples/workflow/main.go`, `examples/workflow-parallel/main.go`

## Issues Found

1. **Wrong import path**: The post used `github.com/dapr/go-sdk/workflow` but no `workflow` package exists in the `go-sdk` module. The correct import for workflow types is `github.com/dapr/durabletask-go/workflow`, and the workflow client comes from `github.com/dapr/go-sdk/client`. Fixed the import block and the install command accordingly.

2. **Wrong activity input option function name**: The post used `workflow.ActivityInput(...)` but the correct function is `workflow.WithActivityInput(...)`. Fixed both occurrences in the workflow definition.

3. **Non-existent worker API**: The post used `workflow.NewWorker()`, `w.RegisterWorkflow()`, `w.RegisterActivity()`, `w.Start()`, and `w.Shutdown()` -- none of these exist. The correct pattern is to create a `workflow.NewRegistry()`, register with `r.AddWorkflow()` / `r.AddActivity()`, create a client via `client.NewWorkflowClient()`, and start the worker with `wclient.StartWorker(ctx, registry)`. Shutdown is handled by cancelling the context. Rewrote the main function accordingly.

4. **Non-existent client API**: The post used `workflow.NewClient()` and `client.ScheduleNewWorkflow()`. The correct API is `client.NewWorkflowClient()` (from the `go-sdk/client` package) and `wclient.ScheduleWorkflow()`. Fixed in the main function.

5. **Missing `log` import**: The post used `log.Fatal()` and `log.Printf()` but did not include `"log"` in the import block. Added it.

6. **Swallowed error**: The original code used `client, _ := workflow.NewClient()` which discards the error. The rewritten code properly handles errors from `client.NewWorkflowClient()`.

## Review Notes
- The conceptual explanations (durable execution, deterministic replay, activity vs workflow separation) are accurate.
- The activity and workflow function signatures (`workflow.ActivityContext` as value, `*workflow.WorkflowContext` as pointer) were correct in the original post.
- The `workflow.WithInstanceID()` and `workflow.WithInput()` option functions were correct.
