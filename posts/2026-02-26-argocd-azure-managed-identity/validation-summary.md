# Validation Summary: How to Configure ArgoCD with Azure Managed Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / Azure Workload Identity
- User-assigned managed identities
- Azure Container Registry
- Azure Key Vault
- Azure DevOps Azure Repos
- Kubernetes service accounts, deployments, and statefulsets
- Azure CLI and kubectl

## Sources Consulted
- Argo CD private repositories documentation: Azure Container Registry/Azure Repos using Azure Workload Identity: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/private-repositories/
- Azure Workload Identity service account labels and annotations: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Azure Container Registry Microsoft Entra permissions and role assignments: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- Microsoft Learn: Provide access to Azure Key Vault keys, certificates, and secrets with Azure RBAC: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found
- The service account manifest placed `azure.workload.identity/use: "true"` on the ServiceAccount. Azure Workload Identity requires this label on the pod template, while the service account carries the `azure.workload.identity/client-id` annotation. Updated the example to patch the Argo CD repo-server deployment and application-controller statefulset pod templates.
- The Argo CD ACR repository secret was missing `useAzureWorkloadIdentity: "true"`, which Argo CD requires for Azure Workload Identity repository authentication. Added the field.
- The ACR repository URL used the legacy Helm repository path with `https://.../helm/v1/repo` while also setting `enableOCI: "true"`. Argo CD's OCI Helm examples use registry/repository paths such as `contoso.azurecr.io/charts` without the URL scheme. Updated the example URL.
- The repo-server configuration omitted `AZURE_ARM_TOKEN_RESOURCE=https://containerregistry.azure.net`, which Argo CD documents as required so the repo server requests valid ACR access tokens. Added the environment variable command.
- The post implied Argo CD would pull container images from ACR. Argo CD repository integration pulls charts and OCI artifacts; Kubernetes nodes pull container images. Updated the wording to OCI Helm charts and charts/artifacts.
- The Key Vault section implied the Argo CD repo-server identity should be used for External Secrets Operator. External Secrets Operator normally reads Key Vault using its own workload identity, even if Argo CD deploys it. Updated the wording to assign Key Vault access to the identity used by the pod that reads Key Vault secrets.
- The architecture diagram showed the Workload Identity webhook exchanging tokens with Entra ID. The webhook injects the projected token and environment variables; the workload exchanges the federated token. Updated the sequence diagram.
- Troubleshooting text said to check service account labels for token injection. Updated it to check the service account annotation and the repo-server pod template label.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI flags were verified against Microsoft Learn documentation rather than local `az --help` output.
- The post uses "Azure AD / Entra ID" terminology. This is understandable for readers, but future updates could consistently use Microsoft Entra ID while mentioning Azure AD as the former name.
