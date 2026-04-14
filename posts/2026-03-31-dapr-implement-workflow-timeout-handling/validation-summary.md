# Validation Summary: How to Implement Workflow Timeout Handling in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Go SDK)
- Durable timers
- Activity retry policies
- Dapr HTTP workflow management API
- github.com/dapr/durabletask-go/workflow package

## Sources Consulted
- Dapr Go SDK source code: https://github.com/dapr/go-sdk (workflow package, deprecated in v1.16)
- Dapr Durable Task Go SDK: https://github.com/dapr/durabletask-go (current workflow authoring package)
- `task.Task` interface in durabletask-go: `Await(v any) error` and `TaskExecutionId() string` — no `Channel()` method
- `workflow.WorkflowContext` methods: `CallActivity`, `CallChildWorkflow`, `CreateTimer`, `WaitForExternalEvent`, `GetInput`, `SetCustomStatus`, `ContinueAsNew`
- `workflow.RetryPolicy` struct: `MaxAttempts`, `InitialRetryInterval`, `BackoffCoefficient`, `MaxRetryInterval`, `RetryTimeout`, `Handle`
- Dapr Workflow HTTP API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr workflow samples: https://github.com/dapr/go-sdk/tree/main/examples/workflow

## Issues Found

### 1. Wrong import path (deprecated package)
- **What was wrong:** Used `github.com/dapr/go-sdk/workflow` which was deprecated in Dapr v1.16 and removed in v1.17.
- **Fix:** Changed to `github.com/dapr/durabletask-go/workflow`.

### 2. `Task.Channel()` does not exist — entire select/channel pattern fabricated
- **What was wrong:** All code examples used `task.Channel()` with Go `select` statements to race tasks. The `Task` interface only has `Await(v any) error` and `TaskExecutionId() string`. There is no `Channel()` method and no `WhenAny` equivalent in the Go SDK.
- **Fix:** Replaced channel/select patterns with correct `Await`-based patterns. For the approval workflow, used `WaitForExternalEvent` with its built-in timeout parameter. For cascading/global timeouts, restructured to use `RetryPolicy.RetryTimeout` to enforce deadlines on activities.

### 3. `WithActivityTimeout()` does not exist
- **What was wrong:** Used `workflow.WithActivityTimeout(30*time.Second)` which is not a real API.
- **Fix:** Replaced with `RetryTimeout: 30 * time.Second` field in `workflow.RetryPolicy`.

### 4. Wrong struct name `ActivityRetryPolicy`
- **What was wrong:** Used `workflow.ActivityRetryPolicy{}`. The correct struct name is `workflow.RetryPolicy`.
- **Fix:** Changed to `&workflow.RetryPolicy{}` (as a pointer, since `WithActivityRetryPolicy` takes `*RetryPolicy`).

### 5. Wrong function name `WithRetryPolicy`
- **What was wrong:** Used `workflow.WithRetryPolicy(retryPolicy)`.
- **Fix:** Changed to `workflow.WithActivityRetryPolicy(retryPolicy)`.

### 6. Wrong function name `ActivityInput`
- **What was wrong:** Used `workflow.ActivityInput(...)` throughout. The current API uses `workflow.WithActivityInput(...)`.
- **Fix:** Changed all occurrences to `workflow.WithActivityInput(...)`.

### 7. `WaitForExternalEvent` called with wrong number of arguments
- **What was wrong:** Called as `ctx.WaitForExternalEvent("approval-received")` with only one argument. The method requires two: `(eventName string, timeout time.Duration)`.
- **Fix:** Changed to `ctx.WaitForExternalEvent("approval-received", 48*time.Hour)` using the built-in timeout parameter.

### 8. Wrong function name `ChildWorkflowInput`
- **What was wrong:** Used `workflow.ChildWorkflowInput(...)`. The current API is `workflow.WithChildWorkflowInput(...)`.
- **Fix:** Changed all occurrences.

### 9. Non-existent HTTP API endpoint for querying workflows by status
- **What was wrong:** Used `GET /v1.0/workflows/dapr?status=RUNNING&createdTimeTo=...` which does not exist. The Dapr workflow API only supports getting a single workflow by instance ID: `GET /v1.0/workflows/{workflowComponentName}/{instanceId}`.
- **Fix:** Replaced with a single-instance GET request.

### 10. Terminate endpoint does not accept a JSON body
- **What was wrong:** The terminate curl command included `-H "Content-Type: application/json" -d '{"terminationReason": "..."}'`. The terminate API does not accept a request body.
- **Fix:** Removed the Content-Type header and JSON body from the terminate command.

### 11. Activity calls not awaited
- **What was wrong:** Several `CallActivity` calls were fire-and-forget (no `.Await(nil)` call), e.g., `ctx.CallActivity(SendApprovalEmail, ...)`. In the Dapr Go SDK, activities must be awaited.
- **Fix:** Added `.Await(nil)` or `.Await(&result)` to all activity calls.

### 12. Missing `fmt` import
- **What was wrong:** The first code example used `fmt.Errorf` but did not include `"fmt"` in the import block.
- **Fix:** Added `"fmt"` to the imports.

### 13. Inaccurate description of timer storage
- **What was wrong:** Stated timers are "stored in the state store." Durable timers are actually persisted via the actor reminder system, which in turn uses the state store.
- **Fix:** Changed to "persisted via the actor reminder system."

## Review Notes
- The Go SDK for Dapr workflows (`dapr/durabletask-go`) does not have a `WhenAny` or task-racing primitive, unlike the .NET SDK which has `Task.WhenAny()`. This means the channel/select pattern shown in the original post is not possible in Go. The corrected code uses `WaitForExternalEvent` with its timeout parameter for the approval pattern, and `RetryPolicy.RetryTimeout` for cascading activity timeouts.
- The `ctx.InstanceID()` method from the deprecated `go-sdk/workflow` package is `ctx.ID()` in the current `durabletask-go/workflow` package. This was removed from the corrected code as the cascading timeout example was restructured.
- There is no bulk query endpoint for Dapr workflows in the HTTP API. To find long-running workflows, you would need to track instance IDs externally and query them individually, or use the underlying state store directly.
