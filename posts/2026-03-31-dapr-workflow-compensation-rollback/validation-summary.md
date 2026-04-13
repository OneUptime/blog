# Validation Summary: How to Handle Dapr Workflow Compensation and Rollback

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (durabletask-go SDK)
- Go programming language
- Saga pattern for distributed transactions
- SQLite backend for durable task orchestration

## Sources Consulted
- Dapr durabletask-go GitHub repository: https://github.com/dapr/durabletask-go
- Go package documentation for task package: https://pkg.go.dev/github.com/dapr/durabletask-go/task
- Go package documentation for sqlite backend: https://pkg.go.dev/github.com/dapr/durabletask-go/backend/sqlite

## Issues Found

1. **Incorrect initialization pattern in main.go (Step 3)**: The blog used `task.NewTaskExecutor(be)` to create an executor and then called `AddOrchestratorN`/`AddActivityN` on it. In the durabletask-go SDK, `AddOrchestratorN` and `AddActivityN` are methods on `task.TaskRegistry`, not the executor. Fixed by creating a `task.NewTaskRegistry()`, registering orchestrators/activities on it, then creating the executor with `task.NewTaskExecutor(r)` and the worker with `backend.NewOrchestrationWorker(...)`.

2. **Incorrect return signature for `sqlite.NewSqliteBackend` (Step 3)**: The blog used `be, _ := sqlite.NewSqliteBackend(...)` (tuple assignment), but the function returns a single `backend.Backend` value, not a tuple. Fixed to a single-value assignment.

3. **Wrong retry policy struct name (Step 4)**: Used `task.ActivityRetryPolicy` which does not exist. The correct struct is `task.RetryPolicy`. Fixed.

4. **Wrong retry policy field `MaxNumberOfAttempts` (Step 4)**: The correct field name is `MaxAttempts`. Fixed.

5. **Wrong retry policy field `FirstRetryInterval` (Step 4)**: The correct field name is `InitialRetryInterval`. Fixed.

6. **Unawaited `NotifyFailureActivity` calls (Step 2)**: Two calls to `ctx.CallActivity(NotifyFailureActivity, ...)` were missing `.Await(nil)`. Without awaiting, the workflow could return before the notification activity completes. Added `.Await(nil)` to both calls.

## Review Notes
- The activity functions do not check the error return from `ctx.GetInput()`. This is acceptable for tutorial brevity but production code should handle these errors.
- The `CancelShipmentActivity` is registered but never used in the compensation flow since shipment is the last step and the workflow returns success if it completes. This is not an error but could be noted for completeness.
- The compensation stack pattern using closures is a valid Go idiom but readers should understand that orchestrator code must be deterministic — the closures capture references to the orchestration context which is replayed. This works correctly in durabletask-go since the closures call `ctx.CallActivity` which is a deterministic orchestration API.
- The mermaid sequence diagram declares a `CP` (CancelReservation) participant that is never used in the flow. This is cosmetic and does not affect technical accuracy.
