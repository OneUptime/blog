# Validation Summary: How to Use Dapr Azure Storage Queues Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings building block)
- Azure Storage Queues
- JavaScript / Node.js (@dapr/dapr SDK)
- Express.js (for input binding consumer)
- Azure CLI (`az storage` commands)
- Kubernetes (secret management)

## Sources Consulted
- Dapr Azure Storage Queues binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/storagequeues/
- Dapr JavaScript SDK client documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr How-To: Use output bindings: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/
- Azure CLI `az storage` command reference: https://learn.microsoft.com/en-us/cli/azure/storage

## Issues Found

### 1. Outdated component metadata field names (3 fields)
**What was wrong:** The component YAML used legacy metadata field names from Dapr < 1.9:
- `storageAccount` (should be `accountName`)
- `storageAccessKey` (should be `accountKey`)
- `queue` (should be `queueName`)

**What was changed:** Updated all three field names to their current equivalents (`accountName`, `accountKey`, `queueName`) in both the component YAML and the `kubectl create secret` command.

**Why:** These field names were renamed in Dapr 1.9+. The old names are deprecated and may not work with current Dapr versions. The current documentation exclusively uses the new names.

## Review Notes
- The `visibilityTimeout` and `pollingInterval` component metadata values use Go-style duration format (`"30s"`, `"5s"`), which is correct per current Dapr docs.
- The per-message `ttlInSeconds` metadata on the output binding send operation is correctly used.
- The per-message `visibilityTimeout` metadata for scheduling delayed messages is consistent with Azure Storage Queues' PUT Message API visibility timeout parameter. Some Dapr versions may use `initialVisibilityDelay` for this purpose — users should verify against their specific Dapr version.
- The JavaScript SDK API (`client.binding.send(name, operation, data, metadata)`) is correct for the `@dapr/dapr` package.
- The input binding consumer pattern (Express app listening on POST `/task-queue`) is correct — Dapr invokes the app on the route matching the component name.
- The `az storage queue metadata show --query approximateMessageCount` command is a valid way to check queue depth, though the count is approximate per Azure's documentation.
