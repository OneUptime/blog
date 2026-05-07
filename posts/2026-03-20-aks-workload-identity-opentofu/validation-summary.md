# Validation Summary: How to Configure AKS Workload Identity with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID
- OpenTofu
- Terraform HCL
- Azure Resource Manager (`azurerm`) provider
- Kubernetes provider
- Azure managed identities
- Azure Key Vault

## Sources Consulted
- Microsoft Learn: Use a Microsoft Entra Workload ID on Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Terraform Registry: `azurerm_kubernetes_cluster` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: `azurerm_federated_identity_credential` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential
- Terraform Registry: `kubernetes_service_account` - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account

## Issues Found
1. Replaced outdated Azure AD/AAD naming with Microsoft Entra ID terminology to match current Azure documentation.
2. Clarified that the Key Vault role assignment example assumes an Azure RBAC-enabled Key Vault, because `Key Vault Secrets User` is an Azure RBAC role.
3. Added the missing Kubernetes provider configuration needed for the `kubernetes_service_account` resource to be managed from OpenTofu against the AKS cluster.
4. Removed the `azure.workload.identity/use` label from the `ServiceAccount` example and clarified that this label must be set on the pod template, per AKS workload identity documentation.
5. Corrected the webhook explanation: AKS projects the service account token into a volume and injects Azure-specific environment variables; it does not inject the OIDC token itself as an environment variable.
6. Updated the federated credential audience comment to use current Microsoft Entra terminology.

## Review Notes
- Microsoft Learn currently documents AKS workload identity support for AKS 1.22+ and Azure CLI 2.47.0+.
- The post uses Terraform provider resources; the same provider schemas are used from OpenTofu, so the examples remain applicable.
