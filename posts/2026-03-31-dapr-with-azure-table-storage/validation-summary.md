# Validation Summary: How to Use Dapr with Azure Table Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API)
- Azure Table Storage
- Azure CLI (`az` commands)
- Kubernetes (secrets)
- Python (`requests` library)
- Azure Cosmos DB (mentioned for comparison)

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Azure Table Storage state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-tablestorage/
- Azure CLI `az storage account` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI `az storage table` reference: https://learn.microsoft.com/en-us/cli/azure/storage/table
- Azure CLI `az storage account keys list` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/keys
- Dapr actor state store configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/

## Issues Found
1. **Kubernetes secret missing `accountKey`**: The bash setup section created a Kubernetes secret containing only `connectionString`, but the first Dapr component YAML referenced `accountKey` from that same secret via `secretKeyRef`. This would cause a runtime failure because the key `accountKey` does not exist in the secret. Fixed by adding an `az storage account keys list` command to retrieve the account key and including it as an additional `--from-literal` entry when creating the Kubernetes secret.

## Review Notes
- The pricing figures in the Cost Comparison section are marked as approximate. Actual Azure pricing may vary by region and over time; readers should consult the Azure pricing calculator for current rates.
- The `cosmosDbMode` metadata field shown in the connection string example is a valid configuration option that distinguishes native Azure Table Storage from Cosmos DB's Table API.
- The Dapr bulk get API (`POST /v1.0/state/<store>/bulk`) and its request/response format are correctly demonstrated.
- The `actorStateStore` metadata field is correctly used to designate the component as the Dapr actor state store.
