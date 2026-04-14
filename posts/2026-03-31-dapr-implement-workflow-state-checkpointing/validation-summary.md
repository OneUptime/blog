# Validation Summary: How to Implement Workflow State Checkpointing in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Workflow
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Durable Task Go SDK (`github.com/dapr/durabletask-go`)
- Dapr State Management API
- Dapr Workflow HTTP API
- Redis state store component

## Sources Consulted
- Dapr Workflow overview documentation (https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/)
- Dapr Workflow API reference (https://docs.dapr.io/reference/api/workflow_api/)
- Dapr Go SDK workflow examples (https://github.com/dapr/go-sdk/tree/main/examples/workflow)
- Dapr durabletask-go source code (https://github.com/dapr/durabletask-go) — `workflow/activity.go`, `workflow/workflow.go`
- Dapr Go SDK client interface (https://github.com/dapr/go-sdk/blob/main/client/state.go) — `SaveState` signature
- Dapr state store component reference for Redis (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr state management how-to: share state (https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/) — `keyPrefix` valid values
- Dapr runtime source code `pkg/api/http/workflow.go` — HTTP route definitions

## Issues Found

1. **Wrong import path for workflow package**: `github.com/dapr/go-sdk/workflow` does not exist. Changed to `github.com/dapr/durabletask-go/workflow`, which is where `WorkflowContext`, `WithActivityInput`, etc. are defined.

2. **Wrong activity input option function**: `workflow.ActivityInput(order)` does not exist in the SDK. Changed to `workflow.WithActivityInput(order)`, which is the correct function name in `durabletask-go/workflow/activity.go`.

3. **Unused imports in first code block**: The first code block imported `context`, `github.com/dapr/durabletask-go/task`, and `github.com/dapr/go-sdk/client` — none of which were used in the workflow function. Removed to avoid Go compilation errors (unused imports are compile errors in Go).

4. **Missing error check on `GetInput`**: `ctx.GetInput(&order)` returns an error that was silently discarded. Added proper error handling.

5. **`SaveState` data parameter type**: The `SaveState` method requires `[]byte` for the data parameter, not an arbitrary Go value. Added `json.Marshal()` to serialize the progress map before passing it to `SaveState`.

6. **Wrong workflow status endpoint URL**: The blog appended `/status` to the endpoint (`/v1.0/workflows/dapr/{instanceId}/status`). The correct Dapr API endpoint is `/v1.0/workflows/dapr/{instanceId}` without the `/status` suffix.

7. **Incorrect response body for workflow status**: The blog showed `lastUpdatedAt` nested inside `properties` as `dapr.workflow.last_updated_at`. In the actual API, `createdAt` and `lastUpdatedAt` are top-level fields in the response. Fixed the example response to match the documented API.

8. **Wrong HTTP method for purge**: The blog used `curl -X DELETE` for the purge endpoint. The Dapr workflow purge API uses `POST`, not `DELETE`. Changed to `curl -X POST`.

9. **Non-existent bulk purge API**: The blog showed a `POST /v1.0/workflows/dapr/purge` endpoint with a JSON body for bulk purging. This API does not exist in Dapr. Removed the fabricated endpoint and added a note that bulk purge requires iterating instances individually.

10. **Invalid `keyPrefix` value**: The blog used `keyPrefix: "workflow"`, but `keyPrefix` only accepts strategy names: `appid` (default), `name`, `namespace`, or `none`. Changed to `"name"` which uses the component name as the prefix.

11. **Imprecise replay description**: The blog stated workflows replay "from the last checkpoint." Dapr Workflow replays the entire event history from the beginning, with already-completed activities returning cached results. Corrected the description.

## Review Notes
- The component name `workflowstore` is technically valid but potentially misleading. Dapr only supports a single actor state store across all actors and workflows. The common convention in Dapr docs is to name it `statestore`.
- The second code block (inside `ProcessLargeDataset`) implicitly requires `context`, `encoding/json`, and `github.com/dapr/go-sdk/client` imports, but since it's shown as a standalone function snippet without a `package` declaration, this is acceptable for a blog post.
- The summary section mentions "schedule regular purges" but the bulk purge API was removed. The advice is still valid — purges should be done per-instance programmatically.
