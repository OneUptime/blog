# Validation Summary: How to Build IoT Firmware Update System with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Actors (.NET SDK)
- Dapr Workflow (Python SDK)
- Dapr HTTP API (actor invocation, state management, workflow management)
- C# / .NET
- Python
- Bash scripting

## Sources Consulted
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr .NET SDK actor usage: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/dotnet-actors-usage/
- Dapr Workflow API reference: https://docs.dapr.io/reference/api/workflow_api/
- Dapr Python SDK workflow documentation: https://docs.dapr.io/developing-applications/sdks/python/python-workflow/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/

## Issues Found

1. **`GetOrCreateStateAsync` is not a valid method** — Changed to `GetOrAddStateAsync`, which is the correct method name in the Dapr .NET SDK `IActorStateManager` interface for retrieving state with a default fallback value.

2. **Actor HTTP method names missing `Async` suffix** — The C# actor implementation defines methods `StartUpdateAsync`, `GetStatusAsync`, and `ReportProgressAsync`. Dapr's HTTP API does not strip the `Async` suffix, so HTTP invocations must use the exact method name. Fixed all actor method URLs in the Python workflow code (`StartUpdate` -> `StartUpdateAsync`) and the bash device-side script (`GetStatus` -> `GetStatusAsync`, `ReportProgress` -> `ReportProgressAsync`).

3. **Workflow status URL was malformed** — The original URL `http://localhost:3500/v1.0/workflows/dapr/firmware-rollout-wf/instances/rollout-v2-1-0` included extra path segments. The correct Dapr workflow GET status endpoint is `/v1.0/workflows/{workflowComponent}/{instanceID}`. Fixed to `http://localhost:3500/v1.0/workflows/dapr/rollout-v2-1-0`.

4. **Missing `import requests` in `push_firmware_batch`** — The `requests` module was only imported inside `get_target_devices` (local import), making it unavailable in `push_firmware_batch` which also calls `requests.post()`. Moved the import to module level so both activity functions can use it.

## Review Notes
- The `rollback_batch` activity is referenced in the workflow but its implementation is not shown. This is acceptable for a tutorial that focuses on the core pattern, but readers should note they need to implement it.
- The bash device-side script uses a hypothetical `flash_firmware` command, which is appropriate for illustrative purposes.
- The post mixes C# (actors) and Python (workflow) which is a valid Dapr pattern since components communicate via HTTP/gRPC, but readers should understand these would be separate services.
