# Validation Summary: How to Configure AKS Azure AD Integration with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- Microsoft Entra ID / Azure AD integration
- Azure RBAC for Kubernetes authorization
- Kubernetes RBAC
- Azure Workload Identity
- Azure CLI
- Kubernetes `kubectl`

## Sources Consulted
- Microsoft Learn: Enable Microsoft Entra ID authentication for the AKS control plane - https://learn.microsoft.com/en-us/azure/aks/entra-id-control-plane-authentication
- Microsoft Learn: Cluster authentication concepts in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/concepts-cluster-authentication
- Microsoft Learn: Cluster authorization concepts in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/concepts-cluster-authorization
- Microsoft Learn: Use Microsoft Entra ID authorization for the Kubernetes API in AKS - https://learn.microsoft.com/en-us/azure/aks/entra-id-authorization
- Microsoft Learn: Use Kubernetes RBAC with Microsoft Entra ID in AKS - https://learn.microsoft.com/en-us/azure/aks/kubernetes-rbac-entra-id
- Microsoft Learn: Use kubelogin to authenticate in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/kubelogin-authentication
- Microsoft Learn: Deploy and Configure an Azure Kubernetes Service (AKS) Cluster with Microsoft Entra Workload ID - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Azure built-in roles for Containers - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers
- AzureRM provider docs: `azurerm_kubernetes_cluster` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster.html.markdown
- AzureRM provider docs: `azurerm_federated_identity_credential` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/federated_identity_credential.html.markdown
- AzureAD provider docs: `azuread_group` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/data-sources/group.md
- Kubernetes provider docs: `kubernetes_cluster_role_binding_v1` - https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cluster_role_binding_v1.md
- Kubernetes docs: `kubectl auth whoami` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_whoami/

## Issues Found
- The post pinned AKS to Kubernetes `1.28`, which is out of support as of 2026-05-07. I removed the hard-coded version so the example no longer points readers at an unsupported release.
- The `azurerm_kubernetes_cluster` examples used `managed = true` inside `azure_active_directory_role_based_access_control`. Current AzureRM provider docs no longer include that argument, so I removed it from both cluster examples.
- The Kubernetes RBAC example used `kubernetes_cluster_role_binding`, while current Kubernetes provider docs document `kubernetes_cluster_role_binding_v1`. I updated the resource name and clarified that this step is an optional Kubernetes RBAC layer alongside Azure RBAC.
- The workload identity example used outdated `azurerm_federated_identity_credential` arguments (`resource_group_name` and `parent_id`). I updated the resource to the current schema using `user_assigned_identity_id`.
- The deployment notes implied the first `kubectl` command would always trigger browser or device-code login and that `az aks get-credentials --admin` only works when local accounts are already enabled. I corrected the notes to reflect current AKS behavior: AKS 1.24+ uses the exec/kubelogin flow automatically for interactive sign-in, and `--admin` is a break-glass path that requires local accounts to be enabled or temporarily re-enabled.

## Review Notes
- The post still uses "Azure AD" terminology in the title and body. Current Microsoft documentation uses "Microsoft Entra ID", but the existing terminology remains understandable.
- The snippets assume the `azurerm`, `azuread`, and `kubernetes` providers are already configured elsewhere in the module.
- `kubectl auth whoami` is valid in current Kubernetes releases, but upstream documents it as experimental.
