# Validation Summary: How to Configure Azure Blob Storage with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Azure Resource Manager (`azurerm`) provider
- Azure Blob Storage
- Azure Storage Accounts
- Azure Private Endpoints
- Azure Private DNS
- Azure RBAC

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_storage_account` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- HashiCorp Terraform Registry: `azurerm_storage_container` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- HashiCorp Terraform Registry: `azurerm_storage_management_policy` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy
- HashiCorp Terraform Registry: `azurerm_private_endpoint` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- HashiCorp Terraform Registry: `azurerm_storage_account_network_rules` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules
- HashiCorp Terraform Registry: `azurerm_private_dns_zone_virtual_network_link` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link
- HashiCorp Terraform Registry: `azurerm_role_assignment` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Microsoft Learn: Azure Blob Storage lifecycle management policy structure — https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn: Azure Storage firewall rules — https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security?tabs=azure-portal
- Microsoft Learn: Use private endpoints for Azure Storage — https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Microsoft Learn: Authorize operations for data access — https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access

## Issues Found
- The storage account replication comment listed `RA-GRS`, but the AzureRM provider accepts `RAGRS` and also supports `RAGZRS`. I corrected the comment to match the current provider schema.
- The container examples used `storage_account_name`, which is deprecated in favor of `storage_account_id` in the AzureRM provider. I updated all three container resources to use `storage_account_id`.
- The comment on `last_access_time_enabled` said it was required for lifecycle tier-based rules in general. Per the provider and Azure lifecycle docs, it is required only for rules based on last access time, not for the modification-time rules shown in the post. I corrected the comment.
- The networking section implied that creating a private endpoint plus the shown firewall rules restricted the account to “private endpoint only.” Microsoft’s storage docs state that private endpoints do not automatically block the public endpoint, and storage firewall rules control access to the public endpoint. I rewrote the comment to reflect that behavior accurately and noted that the referenced subnet must have a `Microsoft.Storage` service endpoint enabled for the virtual network rule.
- The conclusion overstated two claims: that these settings are strictly “required” for production security, and that lifecycle tiering reduces costs by “up to 80%.” I changed the wording to a supported, non-absolute description and aligned the authorization guidance with Microsoft’s recommendation to prefer Microsoft Entra ID-based authorization over Shared Key.

## Review Notes
- If the goal is strict private-endpoint-only access, disabling public network access on the storage account is a clearer pattern than relying on firewall wording alone.
- Virtual network rules on a storage account apply to the public endpoint and require the referenced subnet to have a `Microsoft.Storage` service endpoint enabled.
