# Validation Summary: How to Configure Azure Backend with Managed Identity in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (azurerm backend)
- Azure Managed Identity (system-assigned and user-assigned)
- Azure RBAC (Storage Blob Data Contributor)
- Azure CLI (`az vm identity`, `az role assignment`)
- AzureRM Terraform provider (`azurerm_user_assigned_identity`, `azurerm_role_assignment`, `azurerm_federated_identity_credential`)
- Azure Kubernetes Service (AKS) Workload Identity / Microsoft Entra Workload ID
- Azure DevOps Pipelines

## Sources Consulted
- OpenTofu azurerm backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- Microsoft Learn — Use a Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- AzureRM provider documentation for `azurerm_user_assigned_identity`, `azurerm_role_assignment`, `azurerm_federated_identity_credential`, and `azurerm_kubernetes_cluster` (Terraform Registry).
- Azure CLI reference for `az vm identity assign`, `az vm show`, and `az role assignment create`.

## Issues Found
No technical issues found.

- The azurerm backend options used (`use_msi`, `client_id`, `resource_group_name`, `storage_account_name`, `container_name`, `key`) are all valid per OpenTofu documentation.
- Environment variables `ARM_USE_MSI`, `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID` are correctly named and supported.
- Azure CLI commands (`az vm identity assign`, `az vm show --query identity.principalId`, `az role assignment create`) use correct flags and syntax.
- The role name `Storage Blob Data Contributor` is the correct built-in RBAC role for blob data access.
- The federated identity audience `api://AzureADTokenExchange` is the standard value for Microsoft Entra Workload Identity federation.
- `azurerm_federated_identity_credential` resource arguments (`name`, `resource_group_name`, `parent_id`, `audience`, `issuer`, `subject`) match the provider schema.
- The `oidc_issuer_url` attribute on `azurerm_kubernetes_cluster` is valid when OIDC issuer is enabled on the cluster.

## Review Notes
- The comment "subscription_id and tenant_id are auto-detected from the identity" is slightly simplified — in practice, `subscription_id` is typically supplied via `ARM_SUBSCRIPTION_ID` (as shown later in the Azure DevOps pipeline example) or via configuration; the IMDS provides identity context but not the target subscription. This is a minor stylistic nuance, not a technical error, and the rest of the post (the pipeline example) is consistent with best practice.
- The post uses `use_msi = true` for AKS Workload Identity. The OpenTofu azurerm backend also exposes a more specific `use_aks_workload_identity` option that may be preferred for newer AKS deployments, but the post focuses on creating the federated identity credential resource rather than the backend block, so this is not an inaccuracy.
- The `OpenTofuInstaller@0` Azure DevOps task and its `tofuVersion` input are plausible third-party marketplace task references; readers should consult the specific publisher's documentation for exact input names if using a different installer task.
