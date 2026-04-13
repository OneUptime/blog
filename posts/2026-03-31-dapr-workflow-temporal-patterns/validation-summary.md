# Validation Summary: How to Use Dapr Workflow with Temporal-Style Patterns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- Durable Task Framework (durabletask-go)
- Go programming language
- SQLite backend for durable task storage

## Sources Consulted
- github.com/microsoft/durabletask-go — original Durable Task Framework for Go (source code, API signatures)
- github.com/dapr/durabletask-go — Dapr fork with workflow wrapper package (source code, API signatures, samples)
- github.com/dapr/go-sdk — Dapr Go SDK (workflow client APIs)
- Dapr Workflow documentation — https://docs.dapr.io/developing-applications/building-blocks/workflow/

## Issues Found

1. **Mixed import paths**: The post imported from both `github.com/dapr/durabletask-go/task` and `github.com/microsoft/durabletask-go/backend`. These are separate Go modules with incompatible types. Fixed to use `github.com/dapr/durabletask-go` consistently throughout.

2. **Deprecated `OrchestrationContext`**: All workflow functions used `*task.OrchestrationContext`, which is a deprecated alias. Changed to `*task.WorkflowContext` in all five workflow patterns.

3. **Non-existent `task.WhenAny` function**: Pattern 3 (Durable Timer) used `task.WhenAny(approvalTask, timerTask)` to race a timer against an external event. This function does not exist in either the Microsoft or Dapr fork of durabletask-go. Replaced the entire race pattern with `ctx.WaitForSingleEvent("approval-received", 48*time.Hour)`, which has a built-in timeout that serves the same purpose.

4. **`CreateTimer` takes `time.Duration`, not `time.Time`**: Pattern 3 and 5 passed an absolute `time.Time` via `ctx.CurrentTimeUtc().Add(duration)`. The actual API takes a relative `time.Duration`. Fixed to pass durations directly (e.g., `30 * time.Second`).

5. **`CurrentTimeUtc` is a field, not a method**: The post called `ctx.CurrentTimeUtc()` with parentheses. On `task.WorkflowContext`, `CurrentTimeUtc` is a struct field. Removed usage since `CreateTimer` was corrected to accept durations directly.

6. **`WaitForExternalEvent` → `WaitForSingleEvent`**: On the `task` package, the method is called `WaitForSingleEvent` (not `WaitForExternalEvent`) and requires a `time.Duration` timeout parameter. Fixed in Patterns 3 and 4.

7. **Worker setup completely wrong**: The post used a non-existent `worker.NewTaskHubWorker(backend.NewSqliteBackend("./workflow.db"))` one-liner. The actual setup requires: creating a `TaskRegistry`, registering workflows/activities on it, creating a `TaskExecutor`, instantiating the SQLite backend from the `backend/sqlite` sub-package with `SqliteOptions`, and constructing orchestration/activity workers before creating the `TaskHubWorker`. Rewrote the entire section with the correct multi-step initialization.

8. **Client API methods incorrect**: `client.StartWorkflow` and `client.GetWorkflow` with request structs do not exist. The actual API uses `wc.ScheduleNewOrchestration` and `wc.FetchOrchestrationMetadata` with functional options from the `client` package. Fixed both method calls.

9. **`RaiseWorkflowEvent` → `RaiseEvent`**: The event-raising API uses `wc.RaiseEvent` with `dtc.WithEventPayload()` option, not `client.RaiseWorkflowEvent` with positional arguments. Fixed the method name and parameter style.

## Review Notes
- The conceptual explanations and workflow patterns (saga, fan-out/fan-in, durable timer, external event, eternal workflow) are all accurate and well-described. The issues were exclusively in the Go API surface details.
- The `for { ... break }` pattern in the Monitor workflow (Pattern 5) is idiomatic for continue-as-new workflows since the loop body executes once before calling `ContinueAsNew`.
- The activity function signatures (`func(ctx task.ActivityContext) (any, error)`) were correct throughout.
- The mermaid diagram accurately represents the workflow concepts.
