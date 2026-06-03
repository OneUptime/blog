# Validation Summary: How to Configure ServiceAccount for Azure AD Workload Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / Azure AD Workload Identity
- OpenID Connect federation
- Azure CLI
- Azure RBAC
- Azure Storage, Key Vault, Cosmos DB, and Service Bus
- Azure SDK for Go
- Azure SDK for Python
- Azure Monitor and Microsoft Entra sign-in logs

## Sources Consulted
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure AD Workload Identity documentation: Quick Start: https://azure.github.io/azure-workload-identity/docs/quick-start.html
- Azure AD Workload Identity documentation: Concepts: https://azure.github.io/azure-workload-identity/docs/concepts.html
- Microsoft Learn: Azure CLI `az ad app federated-credential`: https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- Microsoft Learn: Azure CLI `az ad sp`: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn: Azure CLI `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure CLI `az login`: https://learn.microsoft.com/en-us/cli/azure/reference-index
- Microsoft Learn: Azure CLI `az monitor scheduled-query`: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Microsoft Learn: Service principal sign-in logs: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-service-principal-sign-ins
- Microsoft Learn: Azure Monitor Logs `AADServicePrincipalSignInLogs` table: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/aadserviceprincipalsigninlogs
- Go package documentation: `github.com/Azure/azure-sdk-for-go/sdk/azidentity`: https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity
- Go package documentation: `github.com/Azure/azure-sdk-for-go/sdk/storage/azblob`: https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/storage/azblob
- Microsoft Learn: Azure Identity credential chains for Python: https://learn.microsoft.com/en-us/azure/developer/python/sdk/authentication/credential-chains
- Microsoft Learn: Python `WorkloadIdentityCredential`: https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.workloadidentitycredential

## Issues Found
- The post created only an application registration and then used the application client ID for Azure RBAC role assignments. I added creation of the associated service principal and changed role assignment commands to use `--assignee-object-id $SP_OBJECT_ID --assignee-principal-type ServicePrincipal`, which is the reliable form for service principal RBAC assignments.
- The Azure CLI test pod used `az login --identity`, which is managed identity login syntax and does not use the workload identity federated token injected by the webhook. I changed it to `az login --service-principal --federated-token "$(cat $AZURE_FEDERATED_TOKEN_FILE)"` with the injected client and tenant IDs.
- The Azure Storage CLI example did not specify Azure AD authentication mode. I added `--auth-mode login` so the command uses the federated service principal session instead of trying to infer or retrieve account-key authentication.
- The Python SDK example imported `os` but did not use it. I removed the unused import and verified the Python snippet parses successfully.
- The monitoring section described Activity Log queries as sign-in monitoring and attempted to query sign-ins through `az monitor activity-log`. I corrected this to use Activity Log only for role-assignment changes and Microsoft Graph sign-in logs for application sign-ins.
- The failed-authentication alert used a non-existent subscription metric-style condition for `failedSignIns`. I changed it to a scheduled query alert over exported Microsoft Entra service principal sign-in logs in Log Analytics using the `AADServicePrincipalSignInLogs` table.

## Review Notes
- Azure CLI and Go were not installed in the local environment, so those examples were checked against official documentation rather than executed locally.
- The post still uses the older "Azure AD" wording. The current product name is Microsoft Entra ID / Microsoft Entra Workload ID, but the older wording remains common in the Azure Workload Identity project and was not treated as a technical error.
