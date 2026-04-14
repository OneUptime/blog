# Validation Summary: How to Use Managed Dapr on Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (managed runtime on Azure Container Apps)
- Azure Container Apps (ACA)
- Azure CLI (`az containerapp`, `az cosmosdb`, `az monitor`)
- Azure Cosmos DB (SQL API) as Dapr state store
- Azure Managed Identity (system-assigned)
- Azure Monitor / Log Analytics
- Python (requests library for Dapr service invocation)

## Sources Consulted
- Azure Container Apps workload profiles CLI documentation: https://learn.microsoft.com/en-us/azure/container-apps/workload-profiles-manage-cli
- Quickstart: Deploy a Dapr App using the Azure CLI: https://learn.microsoft.com/en-us/azure/container-apps/microservices-dapr
- Dapr Components in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/dapr-components
- Authenticating to Azure with Dapr: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/authenticating-azure/
- Azure Cosmos DB (SQL API) Dapr component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Cosmos DB data plane security reference (built-in roles): https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/reference-data-plane-security
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- az monitor log-analytics CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics
- Monitor logs in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring

## Issues Found
1. **Redundant `dapr-app-id` header in Python service invocation example (Step 6)**: The code included a `headers={'dapr-app-id': 'inventory'}` header when using the direct invoke URL pattern `http://localhost:3500/v1.0/invoke/inventory/method/stock`. When the app ID is already embedded in the URL path, the `dapr-app-id` header is redundant and unnecessary. Removed the header to avoid confusion for readers following the tutorial.

## Review Notes
- The `--enable-workload-profiles` flag in Step 1 still works but is now redundant in modern Azure Container Apps environments, as workload profiles are enabled by default. Not changed since the flag is still valid and does not cause errors.
- The Dapr component YAML in Step 3 correctly uses the ACA-specific simplified format (`componentType` instead of `type`, no `apiVersion`/`kind` fields), which differs from open-source Dapr component YAML.
- The `azureClientId` metadata field is correct for managed identity authentication. For production use, Microsoft recommends also including `azureTenantId`, but for system-assigned managed identity the field shown is sufficient.
- The Cosmos DB built-in role definition ID `00000000-0000-0000-0000-000000000002` is verified as the "Cosmos DB Built-in Data Contributor" role.
- The `ContainerAppConsoleLogs_CL` table name (with `_CL` suffix) is correct for classic custom Log Analytics tables used by Azure Container Apps.
- The `az monitor log-analytics query --analytics-query` syntax is verified correct.
