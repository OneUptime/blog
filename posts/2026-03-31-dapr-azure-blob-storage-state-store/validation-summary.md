# Validation Summary: How to Configure Dapr with Azure Blob Storage State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Blob Storage
- Dapr State Store Component (`state.azure.blobstorage`)
- Azure CLI (`az`)
- Kubernetes (secrets, component manifests)
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr Azure Blob Storage state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-blobstorage/
- Azure CLI `az storage account create` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Azure CLI `az storage container create` reference: https://learn.microsoft.com/en-us/cli/azure/storage/container?view=azure-cli-latest
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found

1. **Typo in storage account name (line 38)**: The `az storage container create` command used `--account-name baprstatestg001` (starting with 'b') instead of `--account-name daprstatestg001` (starting with 'd'). This would cause the command to fail since it references a non-existent storage account. Fixed by correcting the typo to `daprstatestg001`.

2. **Mismatched Kubernetes secret key and component reference**: The `kubectl create secret` command stored the credential under the key `connectionString`, but the Dapr component YAML referenced `accountKey` via `secretKeyRef.key`. The Dapr Azure Blob Storage component expects an `accountKey` metadata field (the storage account access key), not a full connection string. Fixed by changing the kubectl command to use `--from-literal=accountKey="<your-storage-account-key>"` so it matches the YAML component's `secretKeyRef` key name.

## Review Notes
- The Managed Identity snippet shows only the `azureClientId` field. In practice, when using Managed Identity, you would also remove the `accountKey` field entirely. The post implies this but does not state it explicitly.
- The Dapr JS SDK code uses top-level `await`, which requires ES modules or an async wrapper. This is a common pattern in tutorials and is acceptable.
- The `az storage blob download` command to inspect state is correct, but Dapr may prefix blob names with the app ID (e.g., `myapp||app-schema-v4`), so the exact blob name may differ from the state key. This is a subtlety not covered in the post but does not constitute an error.
