# Validation Summary: How to Use Dapr Workflow Child Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (v1.10+)
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr Go SDK (`github.com/dapr/go-sdk/workflow`)
- Dapr HTTP Workflow API
- Durabletask framework (underlying engine)

## Sources Consulted
- Dapr Go SDK workflow package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Python SDK workflow extension documentation: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-workflow-ext/python-workflow/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow authoring guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr v1.10 release notes (workflow alpha introduction)

## Issues Found

### 1. Go activity function signatures used incorrect parameter type
- **What was wrong:** All three Go activity functions (`ValidateOrderActivity`, `ChargePaymentActivity`, `ShipOrderActivity`) used `context.Context` as their first parameter with a typed second parameter for input (e.g., `func ValidateOrderActivity(ctx context.Context, order OrderInput) (bool, error)`). The Dapr Go SDK requires activities to use `daprwf.ActivityContext` as the sole parameter and retrieve input via `ctx.GetInput()`.
- **What was changed:** Updated all activity function signatures to use `daprwf.ActivityContext` and `ctx.GetInput()` pattern, with `(any, error)` return types matching the SDK's `Activity` type definition.
- **Why:** The `ActivityContext` type provides workflow-specific methods (`GetInput`, `GetTaskExecutionID`, `Context`) that are essential for the Dapr workflow runtime. Using `context.Context` would not compile against the SDK's activity registration.

### 2. Go Task type referenced from wrong package
- **What was wrong:** The task slice was declared as `[]*daprwf.Task`, but `Task` is not exported from the `github.com/dapr/go-sdk/workflow` package. It is defined in `github.com/microsoft/durabletask-go/task`. Additionally, `task.Task` is an interface (value type), not a pointer type.
- **What was changed:** Added import for `github.com/microsoft/durabletask-go/task` and changed the slice type to `[]task.Task`. Removed the unused `"context"` import.
- **Why:** `CallChildWorkflow` returns `task.Task` from the durabletask-go package. Using `*daprwf.Task` would fail to compile.

## Review Notes
- The Python SDK code is correct: `call_child_workflow()` with `instance_id` parameter, `wf.when_all()` for fan-in, and decorator-based registration all match the current SDK API.
- The HTTP API endpoints for starting workflows and checking status are correct for the `dapr` workflow component name.
- The Dapr Go SDK documentation notes that `NewWorker()` and `NewClient()` are deprecated in favor of `github.com/dapr/durabletask-go/workflow` and `github.com/dapr/durabletask-go/client` packages. The blog's code still works but may need updating for future SDK versions.
- Dapr v1.10 as the minimum version for workflow support is accurate (workflow was introduced as alpha in v1.10, February 2023).
