# Validation Summary: How to Build a Ticketing System with Dapr Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow (Go SDK)
- Go programming language
- Dapr Workflow REST API
- HTTP/REST endpoints for external event handling

## Sources Consulted
- Dapr Go SDK workflow package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Workflow authoring guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Workflow management guide: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-manage-workflow/
- Dapr Workflow patterns: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-patterns/
- Dapr Go SDK source (GitHub): https://github.com/dapr/go-sdk

## Issues Found

1. **Missing `time` import in data model code block**: The Ticket struct uses `time.Time` but the code block did not import the `"time"` package. Added the import statement.

2. **Non-deterministic `time.Now()` in workflow function**: Dapr workflows are replayed during recovery, so calling `time.Now()` produces different values on replay, breaking determinism. Changed to `ctx.CurrentUTCDateTime()` which returns a deterministic timestamp consistent across replays.

3. **Non-deterministic `time.Until()` in workflow function**: `time.Until()` internally calls `time.Now()`, causing the same determinism issue. Two occurrences were replaced with `ticket.SLADeadline.Sub(ctx.CurrentUTCDateTime())` to compute the remaining SLA duration deterministically.

4. **Incorrect recursive workflow call**: `return TicketWorkflow(ctx)` is not the correct way to restart a Dapr workflow. Direct recursive calls bypass the durable task framework's replay mechanism. Changed to `ctx.ContinueAsNew(ticket, true)` which is the proper Dapr SDK method for restarting a workflow with new input while preserving pending events.

5. **Incorrect `RaiseEvent` call signature**: The blog passed the event payload as a direct positional argument to `RaiseEvent`, but the Go SDK uses a variadic options pattern. The payload must be wrapped with `workflow.WithEventPayload()`. Fixed both occurrences in `handleAssignTicket` and `handleResolveTicket`.

6. **Incorrect REST API endpoints**: The blog showed `GET /v1.0/workflows/dapr/TicketWorkflow/instances` and `GET /v1.0/workflows/dapr/TicketWorkflow/instances/TICKET-123`. Neither endpoint exists in the Dapr Workflow API. There is no bulk instance listing endpoint. The correct endpoint for checking a specific workflow instance is `GET /v1.0/workflows/dapr/{instanceID}`. Fixed to `GET /v1.0/workflows/dapr/TICKET-123`.

## Review Notes
- The `github.com/dapr/go-sdk/workflow` package has been deprecated in favor of `github.com/dapr/durabletask-go/workflow` as of Dapr v1.17. The API surface is similar but readers building new applications should consider using the upstream durabletask-go client directly.
- The blog omits some supporting type definitions (TriageResult, AssignmentEvent, ResolutionEvent, ConfirmEvent) which is acceptable for a tutorial but readers will need to define these themselves.
- Error handling is intentionally minimal for clarity, which is appropriate for a tutorial but should be noted — production code should check errors from `GetInput`, `Decode`, and `NewClient`.
