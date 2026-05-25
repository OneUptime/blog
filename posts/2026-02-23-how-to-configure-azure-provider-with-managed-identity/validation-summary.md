# Validation Summary: How to Configure Azure Provider with Managed Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Terraform azurerm backend
- Azure managed identities
- Azure CLI
- Azure RBAC
- Azure Kubernetes Service
- Microsoft Entra Workload ID
- Azure Blob Storage remote state

## Sources Consulted
- HashiCorp AzureRM provider managed identity guide: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/managed_service_identity.html.markdown
- HashiCorp AzureRM provider AKS workload identity guide: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/guides/aks_workload_identity.html.markdown
- Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Azure CLI `az vm identity` documentation: https://learn.microsoft.com/en-us/cli/azure/vm/identity
- Azure CLI `az identity federated-credential` documentation: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Azure CLI `az role assignment` documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Entra Workload ID on AKS documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- AKS workload identity deployment documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- The sample output for `az vm identity assign` used `systemAssignedIdentity`; current Azure CLI identity output exposes the system-assigned service principal as `principalId`. Updated the comment and sample field name.
- The AKS workload identity Kubernetes YAML put `azure.workload.identity/use: "true"` on the ServiceAccount. Microsoft documentation requires this label on the pod template so the webhook mutates pods. Moved the label into a pod-template snippet and left the client ID annotation on the ServiceAccount.
- The AzureRM provider example for AKS workload identity used `use_oidc = true`. The AzureRM provider's AKS workload identity guide uses `use_aks_workload_identity = true` and recommends disabling Azure CLI auth with `use_cli = false`. Updated the provider block accordingly.
- The Azure Blob remote-state backend example used only `use_msi = true` while recommending `Storage Blob Data Contributor`. For direct Microsoft Entra ID data-plane authentication, the azurerm backend also needs `use_azuread_auth = true` and tenant context. Added `use_azuread_auth` and `tenant_id`.

## Review Notes
- The broader managed identity concepts, Azure CLI command names, role assignment commands, federated credential command shape, provider `use_msi` and `client_id` usage, and IMDS troubleshooting endpoint are consistent with official documentation.
- For newly created managed identities, Azure RBAC role assignments can fail during directory replication. The post already notes propagation delays; a future hardening improvement would be to use `--assignee-object-id` with `--assignee-principal-type ServicePrincipal` for immediate role assignments.
