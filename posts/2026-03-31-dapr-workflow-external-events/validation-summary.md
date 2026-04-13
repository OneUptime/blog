# Validation Summary: How to Use Dapr Workflow External Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow building block
- Dapr Python SDK (`dapr-ext-workflow`)
- Dapr Go SDK (`github.com/dapr/go-sdk/workflow`)
- Dapr HTTP API (workflow management endpoints)

## Sources Consulted
- Dapr Workflow features and concepts documentation (https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-features-concepts/)
- Dapr Workflow API reference (https://docs.dapr.io/reference/api/workflow_api/)
- Dapr Workflow management how-to (https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/)
- Dapr Go SDK source and pkg.go.dev documentation (https://pkg.go.dev/github.com/dapr/go-sdk/workflow)
- Dapr Python SDK source (`dapr-ext-workflow` package on PyPI/GitHub)

## Issues Found

1. **Version requirement incorrect (line 45):** The post stated "Dapr v1.10 or later", but external event support and the Python workflow SDK were added in Dapr v1.11. Changed to "Dapr v1.11 or later".

2. **Go SDK: `ctx.ID()` should be `ctx.InstanceID()` (line 149):** The `WorkflowContext` method for retrieving the workflow instance ID is `InstanceID()`, not `ID()`. Fixed to `ctx.InstanceID()`.

3. **Go SDK: Activity function signatures were incorrect (lines 186-198):** All three Go activity functions used `context.Context` as the first parameter with typed second parameters (e.g., `func SendApprovalRequestActivity(ctx context.Context, req ApprovalRequest) error`). The correct signature uses `daprwf.ActivityContext` as the sole parameter and returns `(any, error)`. Input must be deserialized via `ctx.GetInput()`. All three activity functions were rewritten with correct signatures. The unused `"context"` import was also removed.

## Review Notes
- The Python code is correct and follows current SDK patterns including `wait_for_external_event`, `create_timer`, and `when_any` for the timeout race pattern.
- The HTTP API endpoints for starting workflows, raising events, and checking status are all correct.
- The mermaid diagrams accurately represent the external event flow.
- The Go workflow function signature `func(ctx *daprwf.WorkflowContext) (any, error)` is correct. The call to `ctx.GetInput(&request)` ignores the error return value, which is a minor style issue but acceptable for a tutorial.
