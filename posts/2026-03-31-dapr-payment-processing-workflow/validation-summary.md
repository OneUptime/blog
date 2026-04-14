# Validation Summary: How to Build a Payment Processing System with Dapr Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (durable workflow orchestration)
- Dapr Go SDK (`github.com/dapr/go-sdk/workflow`, `github.com/dapr/go-sdk/client`)
- Go (Golang)
- Dapr Service Invocation (fraud check via `InvokeMethodWithContent`)
- Dapr State Store (audit trail via `SaveState`)

## Sources Consulted
- Dapr Go SDK workflow package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Go SDK client package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK workflow example: https://raw.githubusercontent.com/dapr/go-sdk/main/examples/workflow/main.go
- Dapr Workflow overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/
- Dapr Go SDK workflow documentation: https://docs.dapr.io/developing-applications/sdks/go/go-workflow/

## Issues Found

### 1. Activity function signature used value receiver instead of pointer
- **What was wrong:** The `RunFraudCheck` activity function was declared as `func RunFraudCheck(ctx workflow.ActivityContext) (any, error)` using a value type for `ActivityContext`.
- **What was changed:** Changed to `func RunFraudCheck(ctx *workflow.ActivityContext) (any, error)` using a pointer `*workflow.ActivityContext`.
- **Why:** The Dapr Go SDK defines the `Activity` type as `func(ctx *ActivityContext) (any, error)`. Activities must accept a pointer to `ActivityContext`, not a value. Using a value type would cause a type mismatch when registering the activity with the workflow worker.

### 2. Payment workflow stages listed Settlement but never implemented it
- **What was wrong:** The "Payment Workflow Stages" overview listed 6 stages including "Settlement (async, batch)" as stage 5, but the workflow code only implemented 5 steps and skipped Settlement entirely. Customer Notification was labeled "Step 5" in the code but listed as stage 6 in the overview.
- **What was changed:** Removed the Settlement stage from the overview list, making it 5 stages that match the 5 steps actually implemented in the workflow code.
- **Why:** The mismatch between the documented stages and the implemented steps was confusing. Since Settlement was not implemented anywhere in the post and the workflow is complete without it, removing it from the overview ensures consistency.

## Review Notes
- The blog post does not show import statements. The API usage (`ActivityInput`, `NewClient`, `ScheduleNewWorkflow`, `WithInstanceID`, `WithInput`) is consistent with the `github.com/dapr/go-sdk/workflow` package wrapper, not the lower-level `github.com/dapr/durabletask-go/workflow` package which uses different function names (e.g., `WithActivityInput`, `ScheduleWorkflow`).
- Several places in the code ignore returned errors (e.g., `ctx.GetInput(&payment)`, `json.Unmarshal`, `dapr.NewClient()`). This is common in blog tutorials for brevity but would not be appropriate in production code.
- The fraud check activity constructs JSON via `fmt.Sprintf` with string interpolation, which is fragile and could break with special characters in input. Production code should use `json.Marshal` instead.
- The `dapr.NewClient()` and `dapr.Client` references in the fraud check and audit trail sections assume an import alias of `dapr` for `github.com/dapr/go-sdk/client`. This is a valid but non-standard alias (the package name is `client`).
