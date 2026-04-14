# Validation Summary: How to Build a Microservices-Based ERP with Dapr

## Status
validated

## Post Type
Architecture Guide / Tutorial

## Technologies Covered
- Dapr (state management, pub/sub, service invocation, workflows)
- Go (Dapr Go SDK - `github.com/dapr/go-sdk`)
- Python (Dapr Python SDK - `dapr-ext-workflow`, `dapr.clients`)
- C# / ASP.NET Core (Dapr .NET SDK - `Dapr.AspNetCore`)
- PostgreSQL (as Dapr state store backend)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr Go SDK source and client interface (`github.com/dapr/go-sdk/client`) — verified `SaveStateWithETag`, `GetState`, `PublishEvent`, `SetStateItem`, `ETag` types
- Dapr Python SDK source (`dapr/clients/grpc/client.py` v1.16.2) — verified `publish_event` signature requires `Union[bytes, str]`, raises `ValueError` for other types
- Dapr Python workflow extension (`dapr/ext/workflow`) — verified `WorkflowActivityContext`, `DaprWorkflowClient` exports and `yield ctx.call_activity()` pattern
- Dapr .NET SDK (`Dapr.AspNetCore`) — verified `[Topic]` attribute usage and pub/sub handler patterns
- Dapr component spec documentation — verified `state.postgresql` component type, `v1` version, and metadata fields

## Issues Found
1. **Python `publish_event` called with a dict instead of a serialized string** (line 140): `client.publish_event("pubsub", "po-created", po)` passes a Python `dict` as the `data` argument, but the Dapr Python SDK's `publish_event` method only accepts `Union[bytes, str]` and raises a `ValueError` for other types. Fixed by wrapping the data with `json.dumps(po)`, consistent with the `save_state` call on the line above which already correctly uses `json.dumps()`.

## Review Notes
- The C# finance service uses `CloudEvent<PurchaseOrder>` to receive pub/sub messages. While this works (with the CloudNative.CloudEvents package), the standard Dapr .NET SDK pattern is to receive the deserialized data directly as the parameter type (e.g., `[FromBody] PurchaseOrder po`). The current approach is valid but non-standard — it requires an additional CloudEvents dependency not mentioned in the post.
- The Go code imports `log`, `net/http`, and `daprd` (`github.com/dapr/go-sdk/service/http`) which are not used in the shown snippet. Since the file comment indicates this is `inventory/main.go` and the snippet only shows `updateStock` (no `main` function), these imports would presumably be used in the complete file. Not flagged as an error since the snippet is intentionally partial.
- The Dapr component YAML uses `secretKeyRef` for the connection string, which requires a separate secret store component to be configured. This dependency is not mentioned but is implicit and reasonable for a conceptual architecture post.
