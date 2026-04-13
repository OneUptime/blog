# Validation Summary: How to Use Dapr with Azure Blob Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Blob Storage
- Dapr output bindings (bindings.azure.blobstorage)
- Azure CLI (az storage commands)
- Kubernetes (kubectl for secret creation)
- Python (requests library for HTTP calls)
- Azure Managed Identity authentication

## Sources Consulted
- Dapr Azure Blob Storage binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/blobstorage/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Azure CLI `az storage account` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI `az storage container` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/container

## Issues Found

1. **Wrong component metadata field names**: The component YAML used `storageAccount`, `container`, and `storageAccessKey` which are legacy/undocumented names. Changed to the official field names `accountName`, `containerName`, and `accountKey` per Dapr documentation. Applied to both the access key and managed identity component examples.

2. **Unnecessary base64 encoding in upload**: The upload function base64-encoded the data before sending, but the component spec did not include `decodeBase64: "true"`. This would cause the base64-encoded string to be stored as-is in blob storage rather than the original content. Removed the base64 encoding and changed the function to accept string data directly, which is appropriate for the JSON example shown.

3. **Incorrect download response handling**: The download function used `base64.b64decode(resp.json()["data"])` to parse the response. The Dapr HTTP API returns blob content directly as the response body, not wrapped in a JSON envelope with a `data` key. Changed to `resp.content` which returns the raw bytes from the response.

4. **List operation parameters in wrong location**: The list operation passed `prefix`, `maxResults`, and `include` in the `metadata` field. Per Dapr documentation, these parameters should be in the `data` field. Additionally, `include` should be an object with boolean properties (e.g., `{"metadata": true}`), not a string `"metadata"`. `maxResults` should be an integer, not a string. Moved parameters to `data` and fixed their types.

5. **Wrong delete metadata field name**: The delete operation used `deleteSnapshotsOption` which is not the official field name. Changed to `deleteSnapshots` per Dapr documentation.

## Review Notes
- The `import base64` was removed since it is no longer needed after fixing the upload and download functions.
- The Azure CLI commands for creating the storage account, container, and retrieving keys are correct.
- The managed identity example correctly shows the `azureClientId` field with an empty value for system-assigned managed identity.
- The summary's claim about portability across cloud providers (switching to S3 or GCS with only config changes) is accurate and is a core Dapr design principle.
