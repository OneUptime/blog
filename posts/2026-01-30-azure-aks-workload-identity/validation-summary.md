# Validation Summary: How to Build Azure AKS Workload Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / Azure Workload Identity
- Kubernetes service accounts, pod labels, deployments, and projected service account tokens
- Azure CLI
- Azure managed identities and federated identity credentials
- Azure Key Vault and Azure RBAC
- Azure Storage RBAC
- Azure SDK authentication with DefaultAzureCredential for Python, Go, Node.js, and .NET
- Microsoft Entra diagnostic settings and Log Analytics

## Sources Consulted
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID with AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure Workload Identity documentation: Service account labels and annotations: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- Microsoft Learn: Configure a user-assigned managed identity to trust an external identity provider: https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-create-trust-user-assigned-managed-identity
- Microsoft Learn: Azure CLI `az login` reference: https://learn.microsoft.com/en-us/cli/azure/reference-index?view=azure-cli-latest#az-login
- Microsoft Learn: Azure CLI `az identity federated-credential` reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential?view=azure-cli-latest
- Microsoft Learn: Key Vault Azure RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure built-in roles for databases: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/databases
- Microsoft Learn: Azure Cosmos DB for NoSQL data plane security reference: https://learn.microsoft.com/en-us/azure/cosmos-db/reference-data-plane-security
- Microsoft Learn: Configure Microsoft Entra diagnostic settings: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-configure-diagnostic-settings

## Issues Found
- The generated Key Vault name could exceed Azure Key Vault's 24-character name limit. Changed the random suffix from `openssl rand -hex 4` to `openssl rand -hex 3`.
- The Key Vault example created an RBAC-enabled vault but did not grant the signed-in user a data-plane role before setting a secret. Added a `Key Vault Secrets Officer` assignment for the caller and noted RBAC propagation delay.
- The service account examples claimed that `azure.workload.identity/use: "true"` is required on the service account. The webhook requires this label on the pod template, while the service account needs the managed identity client ID annotation. Removed the service account label and updated the related troubleshooting text.
- The Azure CLI login command inside `kubectl exec` expanded the token file and Azure environment variables in the local shell instead of inside the pod. Replaced it with a `/bin/bash -c` command that reads `$AZURE_FEDERATED_TOKEN_FILE`, `$AZURE_CLIENT_ID`, and `$AZURE_TENANT_ID` inside the container.
- The alternative `az login --identity --username` example was misleading for the workload identity test path. Removed it and kept the federated token login.
- The Cosmos DB role table entry used an inaccurate role/use-case pairing for application data access. Updated it to `Cosmos DB Built-in Data Reader` for Cosmos DB for NoSQL data reads.
- The Microsoft Entra monitoring best-practice command used an invalid-looking `Microsoft.AAD/domainServices` resource path for sign-in logs. Replaced it with the supported Microsoft Entra diagnostic settings workflow for sending sign-in logs to Log Analytics.

## Review Notes
Azure CLI and `kubectl` were not installed in this workspace, so command verification was performed against current official Microsoft Learn CLI references instead of local `--help` output. Azure RBAC and federated credential changes can take time to propagate, so users may still need to wait before immediately testing secret reads or token exchange.
