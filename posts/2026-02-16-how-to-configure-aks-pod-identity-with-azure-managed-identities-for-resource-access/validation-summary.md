# Validation Summary: How to Configure AKS Pod Identity with Azure Managed Identities

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / Azure Workload Identity
- Azure managed identities
- Kubernetes service accounts and deployments
- Azure CLI
- Azure RBAC
- Azure SDK authentication with DefaultAzureCredential
- Python, Node.js, and .NET Azure SDK examples

## Sources Consulted
- Microsoft Learn: Use Microsoft Entra Workload ID with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: az identity federated-credential CLI reference - https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Azure Workload Identity documentation: Service account labels and annotations - https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html

## Issues Found
- The prerequisites listed Azure CLI 2.40+, but current AKS workload identity documentation requires Azure CLI 2.47.0 or later. Updated the prerequisite to Azure CLI 2.47+.
- The prerequisites said Owner role was required for role assignments. Updated this to Owner or User Access Administrator, which is the relevant Azure RBAC permission requirement for creating role assignments.
- The role assignment examples used the managed identity client ID with `--assignee`. Updated the commands to retrieve `principalId` and use `--assignee-object-id` with `--assignee-principal-type ServicePrincipal`, matching current Azure CLI guidance for managed identities.
- The service account manifest put `azure.workload.identity/use: "true"` on the ServiceAccount. Current AKS workload identity behavior requires that label on the pod template so the mutating admission webhook injects the token volume and environment variables. Removed the ServiceAccount label and added the label to the Deployment pod template metadata.
- The troubleshooting guidance said a missing token file could be caused by the service account missing the workload identity label. Updated this to refer to the pod template label.
- The role assignment propagation note said up to 5 minutes. Updated it to up to 10 minutes to match the AKS workload identity deployment documentation.

## Review Notes
The remaining commands and configuration snippets match the current AKS workload identity flow: enable OIDC issuer and workload identity, create a user-assigned managed identity, create a federated credential with the Kubernetes service account subject, annotate the service account with the managed identity client ID, label the pod template, and use Azure Identity SDK credentials. The local environment did not have the Azure CLI installed, so CLI validation was performed against official Microsoft Learn references rather than local `az --help` output.
