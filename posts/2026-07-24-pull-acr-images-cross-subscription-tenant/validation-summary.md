# Validation Summary: Pulling ACR Images Across Azure Subscriptions and Microsoft Entra Tenants

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Azure Container Registry (ACR)
- Microsoft Entra ID applications, enterprise applications, service principals, and managed identities
- Azure role-based access control (Azure RBAC)
- Microsoft Entra attribute-based access control (ABAC) for ACR repositories
- Azure Kubernetes Service (AKS) kubelet identities and service principal authentication
- Azure Container Apps managed-identity image pulls
- Azure CLI
- Kubernetes Deployments and image pull secrets
- ACR private endpoints, DNS, firewalls, and registry connectivity

## Sources Consulted

- [Scenarios to authenticate with Azure Container Registry from Kubernetes](https://learn.microsoft.com/en-us/azure/container-registry/authenticate-kubernetes-options)
- [Authenticate with Azure Container Registry from Azure Kubernetes Service](https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration)
- [Pull images from a container registry to an AKS cluster in a different Microsoft Entra tenant](https://learn.microsoft.com/en-us/azure/container-registry/authenticate-aks-cross-tenant)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Use a managed identity to authenticate to an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity)
- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Create an enterprise application from a multitenant application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant)
- [Assign Azure roles using Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
- [Update or rotate the credentials for an Azure Kubernetes Service cluster](https://learn.microsoft.com/en-us/azure/aks/update-credentials)
- [Azure Container Apps image pull from Azure Container Registry with managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull)
- [Pull an image from Azure Container Registry to a Kubernetes cluster using a pull secret](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-kubernetes)
- [Troubleshoot image pull failures from Azure Container Registry to AKS](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/connectivity/cannot-pull-image-from-acr-to-aks-cluster)
- [Configure rules to access an Azure container registry behind a firewall](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-rules)
- [Azure CLI reference: `az acr`](https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest)
- [Azure CLI reference: `az ad sp`](https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest)
- [Kubernetes API reference: Deployment v1](https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/)
- [kubectl reference: create secret docker-registry](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/)

## Issues Found

- The post referred to a Container Apps environment as the image-pull identity holder. Container Apps configures the managed identity on the container app, and managed-identity image pulls also require the registry to allow ARM audience tokens. Changed the text to refer to a container app and added the ARM-token prerequisite.
- The cross-tenant AKS credential update used an undefined `TENANT_A_ID` and `APP_CLIENT_SECRET`, and it did not select the already-declared AKS subscription. Added the Tenant A variable, a non-echoing secret prompt, and `--subscription "$AKS_SUBSCRIPTION_ID"` so the example has the required inputs and targets the intended cluster subscription.
- The `apps/v1` Deployment omitted the required `.spec.selector` and matching pod-template labels, so Kubernetes would reject it. Added `app: payments-api` to both the selector and `.spec.template.metadata.labels`.
- The troubleshooting text described `403 Forbidden` primarily as proof of successful authentication followed by insufficient authorization. Current AKS troubleshooting guidance commonly associates ACR pull `403` responses with registry network access, including private DNS and IP allowlist configuration. Corrected the diagnostic guidance and clarified that a `403` alone does not prove authentication succeeded.

## Review Notes

- All Bash snippets passed shell syntax parsing after the corrections. Azure CLI flags and query paths were checked against current official references and locally available Azure CLI help.
- The Kubernetes YAML parsed successfully, and its required Deployment selector was verified to match the pod-template labels.
- A live cross-tenant pull was not executed because the review environment does not contain the example tenants, Azure resources, identities, or secrets.
- Updating service principal credentials on an AKS cluster backed by Virtual Machine Scale Sets performs a node image upgrade and can take several minutes or longer. Operators should account for that operational impact when applying the documented cross-tenant procedure.
- Creating the Tenant B enterprise application with `az ad sp create` requires an appropriate Microsoft Entra administrative role, and creating the ACR role assignment requires Azure RBAC role-assignment permission.
