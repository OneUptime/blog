# Validation Summary: How to Configure Dapr with Azure Cosmos DB State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- Azure Cosmos DB (API for NoSQL)
- Azure CLI
- Kubernetes (secrets, component deployment)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Azure Managed Identity (Microsoft Entra ID)

## Sources Consulted
- Dapr Cosmos DB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr authenticating to Azure: https://docs.dapr.io/developing-applications/integrations/azure/authenticating-azure/
- Dapr JS SDK source (`IClientState.ts` interface and quickstart examples)
- Azure CLI `az cosmosdb` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Azure CLI `az cosmosdb keys list` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/keys
- Azure CLI `az cosmosdb sql role assignment` reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/role/assignment
- Azure Cosmos DB API naming: https://learn.microsoft.com/en-us/azure/cosmos-db/choose-api

## Issues Found
- **"SQL API" renamed to "API for NoSQL"**: The prerequisites referenced "SQL API", which Microsoft has rebranded to "API for NoSQL" (Azure Cosmos DB for NoSQL). Updated the prerequisite text accordingly. Note: the Azure CLI commands still use the `az cosmosdb sql` prefix, so all CLI commands in the post remain correct.

## Review Notes
- The `az cosmosdb sql role assignment create` command uses `--role-definition-name`, which is valid but less common in official docs. The Dapr docs recommend using `--role-definition-id "00000000-0000-0000-0000-000000000002"` instead. Both approaches work; the blog's approach is technically correct.
- The partition key path `/partitionKey` is a hard requirement for Dapr's Cosmos DB state store and is correctly documented.
- All Dapr component metadata field names (`url`, `masterKey`, `database`, `collection`, `actorStateStore`) are verified correct and case-sensitive.
- The JavaScript SDK usage (`client.state.save` and `client.state.get`) matches the current Dapr JS SDK API signatures.
- The managed identity field `azureClientId` is correct per Dapr's Azure authentication docs.
