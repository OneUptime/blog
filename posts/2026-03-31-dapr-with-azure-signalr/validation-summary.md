# Validation Summary: How to Use Dapr with Azure SignalR

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- Azure SignalR Service
- Python (requests library)
- JavaScript / React (@microsoft/signalr client SDK)
- Azure CLI
- Kubernetes (secrets)

## Sources Consulted
- Dapr Azure SignalR binding specification: https://docs.dapr.io/reference/components-reference/supported-bindings/signalr/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr SignalR binding source code (github.com/dapr/components-contrib/bindings/azure/signalr/signalr.go) for metadata key verification
- Azure CLI `az signalr create` documentation: https://learn.microsoft.com/en-us/cli/azure/signalr
- Azure CLI `az signalr key list` documentation: https://learn.microsoft.com/en-us/cli/azure/signalr/key
- Microsoft SignalR JavaScript client documentation: https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client

## Issues Found

1. **Wrong per-request metadata keys throughout all Python examples.** The blog used `userId`, `groupName`, and `hubName` as metadata keys in the Dapr binding invoke payload. According to the Dapr SignalR binding source code, the correct keys are `user`, `group`, and `hub` respectively. Fixed all three Python code examples:
   - `send_to_user`: changed `userId` to `user`, removed unused `groupName` key, changed `hubName` to `hub`
   - `send_to_group`: changed `groupName` to `group`, changed `hubName` to `hub`
   - `broadcast`: changed `hubName` to `hub`

2. **`--enable-message-logs` flag missing explicit value.** The `az signalr create` command used `--enable-message-logs` without a value. The Azure CLI expects an explicit boolean: `--enable-message-logs true`. Fixed to include the explicit `true` value.

## Review Notes
- The `send_to_user` function accepts an `event` parameter that is never used in the function body. This is not a runtime error but is misleading in a tutorial context. The Dapr SignalR binding does not have a built-in metadata field for specifying the SignalR target/method name separately from the data payload.
- The React client listens on method name `'notifications'` which matches the hub name. In practice, the method name the client listens on must match the target specified when sending messages through Azure SignalR. The exact target behavior depends on how the data payload is structured and the SignalR service mode configuration.
- The component YAML and Dapr API endpoint format are correct.
- The `az signalr key list --query primaryConnectionString` command correctly extracts the connection string field.
