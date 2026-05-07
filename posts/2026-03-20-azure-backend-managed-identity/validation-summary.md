# Validation Summary: How to Configure Azure Backend with Managed Identity in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Blob Storage backend (`azurerm`)
- Azure Managed Identity
- Microsoft Entra Workload ID for AKS
- Azure Container Instances
- Azure Virtual Machines
- GitHub Actions OIDC / workload identity federation
- HCL
- YAML

## Sources Consulted
- OpenTofu `azurerm` backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- Terraform `azurerm` backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Azure AKS workload identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure Container Instances managed identity documentation: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-managed-identity
- Azure managed identities for Azure VMs: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-configure-managed-identities
- Azure Login action documentation: https://github.com/Azure/login
- GitHub Docs, configuring OpenID Connect in Azure: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- GitHub `actions/checkout` documentation: https://github.com/actions/checkout
- OpenTofu setup action documentation: https://github.com/opentofu/setup-opentofu
- AzureRM provider docs for `azurerm_container_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group
- AzureRM provider docs for `azurerm_linux_virtual_machine`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine

## Issues Found
- The backend examples used `use_msi = true` with only `Storage Blob Data Contributor` access. That combination is incomplete for direct state access via Microsoft Entra ID. I added `use_azuread_auth = true` and `ARM_USE_AZUREAD=true` so the examples align with the documented Entra ID data-plane authentication flow.
- The Azure Container Instance example set `SUBSCRIPTION_ID` and `TENANT_ID` environment variables, which the OpenTofu backend does not read. I changed them to the supported `ARM_*` environment variables and added `ARM_CLIENT_ID` for the user-assigned managed identity case.
- The AKS example used older naming and omitted a required workload identity detail. I renamed it to Microsoft Entra Workload ID, added the required pod label note (`azure.workload.identity/use: "true"`), and clarified that AKS should use `use_aks_workload_identity` / `ARM_USE_AKS_WORKLOAD_IDENTITY` rather than `use_msi`.
- The GitHub Actions example was incomplete for OIDC-backed execution. It was missing `permissions: id-token: write`, did not check out the repository before running `tofu`, and did not enable Entra ID auth for the backend. I updated the workflow snippet accordingly and refreshed the action versions shown in the example.

## Review Notes
- The examples continue to include `resource_group_name` in backend blocks. That remains valid, although it is not required for standard Entra ID data-plane authentication unless management-plane lookup is needed.
- The RBAC examples assign `Storage Blob Data Contributor` at the storage account scope. This is technically correct, though scoping the role to the container would be a tighter least-privilege option.
