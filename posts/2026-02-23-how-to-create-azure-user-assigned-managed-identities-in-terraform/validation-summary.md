# Validation Summary: How to Create Azure User-Assigned Managed Identities in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure managed identities
- Microsoft Entra ID
- Azure RBAC role assignments
- Azure Virtual Machines
- Azure App Service and Function Apps
- Azure Key Vault references
- Azure Kubernetes Service workload identity

## Sources Consulted
- HashiCorp Terraform Registry, AzureRM provider 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- HashiCorp Terraform Registry, azurerm_user_assigned_identity resource/data source attributes: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity
- HashiCorp Terraform Registry, azurerm_role_assignment resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- HashiCorp Terraform Registry, azurerm_linux_virtual_machine resource identity block: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- HashiCorp Terraform Registry, azurerm_linux_web_app resource and key_vault_reference_identity_id: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- HashiCorp Terraform Registry, azurerm_federated_identity_credential resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential
- Microsoft Learn, managed identity best practice recommendations: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identity-best-practice-recommendations
- Microsoft Learn, Key Vault references in Azure App Service and Azure Functions: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Microsoft Learn, Microsoft Entra Workload ID on AKS overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn, deploy and configure AKS workload identity: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- The provider example pinned AzureRM to `~> 3.80`, which is no longer current for a 2026 article. Updated it to `~> 4.0` and added an explicit `subscription_id` variable because AzureRM v4 requires the subscription ID to be provided in configuration or through `ARM_SUBSCRIPTION_ID` for plan/apply operations.
- The article used the old Azure Active Directory name. Updated references to Microsoft Entra ID while preserving the technical meaning.
- The AKS workload identity snippet omitted the required cluster/service-account prerequisites. Added a concise note that the AKS cluster must have OIDC issuer and workload identity enabled and that the Kubernetes service account must be configured to use the managed identity.

## Review Notes
The Terraform resource names, identity blocks, role assignment attributes, App Service Key Vault reference identity setting, and federated identity credential fields are consistent with the official AzureRM provider documentation. The examples still reference surrounding resources such as storage accounts, Key Vaults, service plans, network interfaces, and AKS clusters that must be defined elsewhere in a complete Terraform configuration.
