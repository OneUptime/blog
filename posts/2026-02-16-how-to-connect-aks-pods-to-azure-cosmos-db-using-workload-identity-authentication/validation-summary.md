# Validation Summary: How to Connect AKS Pods to Azure Cosmos DB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID
- Kubernetes service accounts and pod labels
- Azure user-assigned managed identities
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB data-plane RBAC
- Azure CLI
- Azure Identity SDK for .NET and Python
- Microsoft.Azure.Cosmos .NET SDK
- azure-cosmos Python SDK

## Sources Consulted
- Microsoft Learn: Use Microsoft Entra Workload ID with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Connect using role-based access control and Microsoft Entra ID for Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-connect-role-based-access-control
- Microsoft Learn: Azure CLI `az cosmosdb sql role assignment` reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/role/assignment
- Microsoft Learn: `CosmosClient` class for Microsoft.Azure.Cosmos .NET SDK - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.cosmosclient
- Microsoft Learn: `WorkloadIdentityCredential` class for Azure.Identity .NET SDK - https://learn.microsoft.com/en-us/dotnet/api/azure.identity.workloadidentitycredential
- Microsoft Learn: Azure Cosmos DB quickstart for Python - https://learn.microsoft.com/en-us/azure/cosmos-db/quickstart-python
- Microsoft Learn: Azure Cosmos DB Python SDK get started guide - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-python-get-started

## Issues Found
- The post placed the `azure.workload.identity/use: "true"` label on the Kubernetes ServiceAccount and said to check the service account for that label during troubleshooting. Microsoft Entra Workload ID documentation requires this label on the pod template so the mutating admission webhook injects the Azure environment variables and projected token volume. I removed the label from the ServiceAccount example, added it to the Deployment pod template labels, and updated the troubleshooting note accordingly.

## Review Notes
The Azure CLI commands, federated credential subject format, Cosmos DB built-in Data Contributor role definition ID, data-plane RBAC scope of `/`, and .NET/Python SDK token credential examples are consistent with current official Microsoft documentation. Cosmos DB RBAC assignments and federated credential creation can take time to propagate, which the post already notes for RBAC.
