# Validation Summary: How to Implement the Saga Pattern with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (durable execution engine)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Durable Task Go SDK (`github.com/dapr/durabletask-go`)
- Go programming language
- Saga distributed transaction pattern
- Dapr Workflow REST API

## Sources Consulted
- Official Dapr Go SDK workflow example: https://github.com/dapr/go-sdk/blob/main/examples/workflow/main.go
- Dapr Go SDK source code: https://github.com/dapr/go-sdk
- Dapr Durable Task Go SDK: https://github.com/dapr/durabletask-go
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Go SDK workflow documentation: https://docs.dapr.io/developing-applications/sdks/go/go-workflow/

## Issues Found

1. **Deprecated import path**: The post used `github.com/dapr/go-sdk/workflow` which is deprecated. Changed to `github.com/dapr/durabletask-go/workflow` for workflow types/registry and added `github.com/dapr/go-sdk/client` for the workflow client. The old `github.com/dapr/go-sdk/workflow` package has `NewWorker()` and `NewClient()` marked as deprecated in favor of the `durabletask-go` package.

2. **`workflow.ActivityInput()` renamed to `workflow.WithActivityInput()`**: The option function for passing input to activities was renamed in the current API. All six occurrences in the workflow function were updated.

3. **Worker creation API changed**: `workflow.NewWorker()` no longer exists in the current API. Replaced with `workflow.NewRegistry()` which is used to register workflows and activities, combined with `client.NewWorkflowClient()` and `wfClient.StartWorker(ctx, r)` to start the worker.

4. **Registration methods renamed**: `w.RegisterWorkflow()` and `w.RegisterActivity()` changed to `r.AddWorkflow()` and `r.AddActivity()` on the registry object.

5. **Client creation changed**: `workflow.NewClient()` replaced with `client.NewWorkflowClient()` from the `github.com/dapr/go-sdk/client` package.

6. **Schedule method renamed**: `wfClient.ScheduleNewWorkflow()` changed to `wfClient.ScheduleWorkflow()`.

7. **Incorrect REST API endpoint**: The post had `GET /v1.0/workflows/dapr/OrderSaga/instances/INSTANCE_ID` but the correct Dapr workflow status endpoint is `GET /v1.0/workflows/dapr/INSTANCE_ID` — the workflow name and `/instances/` segment are not part of the GET status path.

## Review Notes
- The saga pattern explanation and compensating transaction logic are conceptually correct and well-structured.
- The activity function signature `func(ctx workflow.ActivityContext) (any, error)` is correct for the current API where `ActivityContext` is an interface type (no pointer needed).
- The workflow function signature `func(ctx *workflow.WorkflowContext) (any, error)` with pointer receiver is correct.
- Helper types (`PaymentResult`, `InventoryResult`, `ShipmentResult`) and external function calls (`callPaymentService`, `callPaymentService_Cancel`) are left undefined as they represent application-specific implementations — this is appropriate for a pattern-focused tutorial.
