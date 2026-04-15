# Validation Summary: How to Authenticate Dapr with Azure Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (component model, state store)
- Azure Cosmos DB (state store backend)
- Azure Service Principals (`az ad sp create-for-rbac`)
- Azure Managed Identity (system-assigned and user-assigned)
- Azure Workload Identity Federation
- Azure Kubernetes Service (AKS)
- Kubernetes Secrets

## Sources Consulted
- Dapr Azure Cosmos DB State Store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr Azure Authentication overview: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/authenticating-azure/
- Dapr How-To: Use Managed Identities: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/howto-mi/
- Dapr Component Secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Azure Cosmos DB Data Plane Security Reference: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/reference-data-plane-security
- AKS Workload Identity deployment guide: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- **System-assigned managed identity configuration**: The original post set `azureClientId` to an empty string (`""`) with a comment saying this uses system-assigned identity. Per the official Dapr documentation, the correct approach is to **omit the `azureClientId` field entirely** rather than setting it to an empty string. The field was removed and replaced with a YAML comment explaining the omission.

## Review Notes
- The Workload Identity section (Method 4) shows only the Azure CLI setup (federated credential creation, AKS update) but does not include a Dapr component YAML example or the required Kubernetes ServiceAccount annotation (`azure.workload.identity/client-id`) and pod label (`azure.workload.identity/use: "true"`). This is a completeness gap, not a technical error in the existing content.
- All CLI commands (`az ad sp create-for-rbac`, `az aks update`, `az identity create`, `az identity federated-credential create`, `az cosmosdb sql role assignment create`) have correct flags and syntax.
- The Cosmos DB built-in Data Contributor role ID (`00000000-0000-0000-0000-000000000002`) is correct.
- The `secretKeyRef` syntax for referencing Kubernetes secrets in Dapr component metadata is correct.
- The `api://AzureADTokenExchange` audience value for workload identity federation is correct.
