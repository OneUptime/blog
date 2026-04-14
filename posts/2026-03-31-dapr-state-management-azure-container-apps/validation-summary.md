# Validation Summary: How to Use Dapr State Management on Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, actors)
- Azure Container Apps (Dapr component configuration)
- Azure Cosmos DB (SQL API, serverless)
- Azure CLI (`az cosmosdb`, `az containerapp`)
- Python (`requests` library)

## Sources Consulted
- Dapr State Management API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Azure Cosmos DB State Store Component — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Azure Container Apps Dapr Components — https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Azure CLI `az cosmosdb` reference — https://learn.microsoft.com/en-us/cli/azure/cosmosdb

## Issues Found
1. **Incorrect bulk save URL (Step 5)**: The bulk save used `POST /v1.0/state/statestore/bulk`, but the `/bulk` sub-path only exists for bulk GET operations. The regular save endpoint `POST /v1.0/state/{storename}` already accepts an array of key-value objects and serves as the bulk save mechanism. Changed the URL from `http://localhost:3500/v1.0/state/statestore/bulk` to `http://localhost:3500/v1.0/state/statestore`.

## Review Notes
- The Azure CLI commands for creating a serverless Cosmos DB account, database, and container are correct, including the `/partitionKey` partition key path which is what Dapr expects.
- The Azure Container Apps Dapr component YAML correctly uses `componentType` (not `type`) which is the ACA-specific schema, distinct from the standard Dapr open-source component YAML.
- The ETag concurrency example correctly uses `first-write` concurrency mode inside an `options` object.
- The transaction endpoint and body format are correct, using `upsert` operations with proper `operation`/`request` structure.
