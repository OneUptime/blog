# Validation Summary: How to Set Up Dapr Pub/Sub with Azure Event Hubs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Event Hubs
- Azure Blob Storage (checkpoint store)
- Azure CLI
- Kubernetes (secrets, CRDs)
- Python (Dapr SDK, Flask)
- Mermaid (diagrams)

## Sources Consulted
- Dapr Azure Event Hubs pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-eventhubs/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Azure CLI Event Hubs commands: https://learn.microsoft.com/en-us/cli/azure/eventhubs
- Azure CLI Storage commands: https://learn.microsoft.com/en-us/cli/azure/storage

## Issues Found
1. **Invalid `messageCount` metadata field removed.** The Dapr component configuration included `messageCount` with value `"100"`, but this is not a documented metadata field for `pubsub.azure.eventhubs`. Removed to avoid misleading readers.
2. **Unnecessary `partitionCount` metadata field removed.** The `partitionCount` field is only meaningful when `enableEntityManagement` is set to `true` (i.e., Dapr auto-creates the Event Hub). Since the blog post creates the Event Hub via Azure CLI with `--partition-count 4`, including this field without entity management enabled is misleading. Removed.
3. **Mermaid diagram route mismatch fixed.** The diagram label showed `POST /handle` for the subscriber callback, but the actual route configured in the subscription and subscriber code is `/handle-order`. Changed to `POST /handle-order` for consistency.

## Review Notes
- The managed identity component example omits `azureTenantId` and `azureClientSecret`, which is correct for a user-assigned managed identity on Azure (e.g., Workload Identity). For a service principal, all three fields would be required. The blog could mention this distinction but it is not technically incorrect as written.
- The `consumerID` field defaults to the Dapr app ID if omitted. The blog explicitly sets it, which is good practice for clarity and control.
- The Subscription CRD uses v1alpha1. Dapr also supports v2alpha1 with a different structure (`routes` instead of `route`). The v1alpha1 format used here is still valid.
- The `scopes` field in the Subscription YAML is correctly placed at the top level (not under `spec`), matching the v1alpha1 CRD schema.
