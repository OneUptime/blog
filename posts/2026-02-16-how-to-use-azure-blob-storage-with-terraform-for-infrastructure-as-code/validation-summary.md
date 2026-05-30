# Validation Summary: How to Use Azure Blob Storage with Terraform for Infrastructure as Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blob Storage
- Azure Storage accounts and containers
- Azure CLI
- Terraform
- HashiCorp AzureRM provider
- Terraform AzureRM backend
- Azure Storage lifecycle management
- Azure Storage network rules

## Sources Consulted
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp AzureRM provider storage account resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- HashiCorp AzureRM provider storage container resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container
- HashiCorp AzureRM provider storage management policy resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy
- HashiCorp AzureRM provider storage account network rules resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules
- Microsoft Learn Azure CLI `az ad sp create-for-rbac` documentation: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn Azure Storage account creation documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn Azure Blob versioning documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-enable
- Microsoft Learn Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Microsoft Learn Azure Storage container CLI documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/blob-containers-cli

## Issues Found
- The post pinned the AzureRM provider to `~> 3.90`, which keeps readers on the older 3.x provider line. Updated it to `~> 4.0` so the examples target the current AzureRM major version.
- The storage container examples used `storage_account_name`, which is deprecated in current AzureRM provider versions in favor of `storage_account_id`. Updated all container resources to use `storage_account_id = azurerm_storage_account.main.id`.
- The lifecycle management policy used `delete_after_days_since_creation` in the `version` block. The correct AzureRM argument is `delete_after_days_since_creation_greater_than`, so the field was corrected.
- The multi-environment example set a `replication` value in tfvars, but the storage account resource was hard-coded to `GRS` and no `replication` variable was declared. Added the variable and wired `account_replication_type` to `var.replication`.
- The network rules example referenced subnet IDs without noting the Azure Storage service endpoint requirement for virtual network rules. Added a concise comment that the subnets must have the `Microsoft.Storage` service endpoint enabled.
- The authentication guidance described service principal credentials as the recommended CI/CD approach. Updated the wording to note that OpenID Connect or workload identity federation is preferred where supported because it avoids long-lived client secrets.

## Review Notes
The Azure CLI commands and Terraform backend configuration are valid, but the backend example uses the traditional access-key lookup path unless readers configure Microsoft Entra ID authentication. HashiCorp's current backend documentation recommends Microsoft Entra ID and OIDC/workload identity federation for new workloads.
