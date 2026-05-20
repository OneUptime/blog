# Validation Summary: How to Use Azure Container Registry with ArgoCD OCI

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Helm OCI repositories
- Azure Container Registry
- Azure Kubernetes Service
- Microsoft Entra service principals
- Azure Workload Identity
- Kubernetes Secrets and ServiceAccounts

## Sources Consulted
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD private repository documentation for Helm OCI and Azure Workload Identity: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Azure Container Registry Helm OCI documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- Azure Container Registry authentication overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Azure Workload Identity labels and annotations: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- Azure Container Registry geo-replication documentation: https://learn.microsoft.com/en-gb/azure/container-registry/container-registry-geo-replication

## Issues Found
- The post implied Argo CD could pull generic OCI artifacts from ACR through the same Helm examples. I narrowed the claim to Helm charts, which is what the commands and Application manifest configure.
- The prerequisites referenced Argo CD v2.8 for "full OCI support" and did not specify a current Helm OCI baseline. I changed this to require Argo CD with Helm OCI repository support and Helm 3.8 or later, matching current Helm OCI guidance.
- The Argo CD Helm OCI repository examples used `myregistry.azurecr.io` with `chart: helm/my-chart`. I changed the repository URL to `myregistry.azurecr.io/helm` and the chart name to `my-chart`, matching the pushed OCI chart reference.
- The AKS managed identity section incorrectly said Argo CD repo-server automatically inherits kubelet AcrPull permissions and can use anonymous repository access. I corrected this to explain that AKS ACR attachment helps workload image pulls, but Argo CD repository access still needs service principal credentials or Azure Workload Identity.
- The Azure Workload Identity setup was incomplete. I added the required Argo CD repository flag/secret field, the repo-server pod label, and the `AZURE_ARM_TOKEN_RESOURCE=https://containerregistry.azure.net` environment variable.
- The workload identity ServiceAccount example placed `azure.workload.identity/use` on the ServiceAccount. I removed that label from the ServiceAccount example because Azure Workload Identity requires it on the pod template.
- The geo-replication section used an incorrect regional login server pattern. I updated it to explain default global endpoint routing and used the documented regional endpoint pattern `myregistry.<region>.geo.azurecr.io` for regional endpoints.
- The token refresh section described ACR access-token expiry as configurable. I changed it to state that Microsoft Entra registry access tokens expire after 3 hours.

## Review Notes
The corrected guide is technically valid for Helm charts stored as OCI artifacts in ACR. Future improvements could add a separate generic OCI artifact example using Argo CD's `oci://` source syntax, but that would be new content beyond the scope of this validation.
