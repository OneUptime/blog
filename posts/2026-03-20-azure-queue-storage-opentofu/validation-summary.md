# Validation Summary: How to Create Azure Queue Storage with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Queue Storage
- Azure Storage Account
- Azure RBAC
- OpenTofu
- AzureRM provider
- HCL

## Sources Consulted
- Microsoft Learn: Azure Queue Storage introduction — https://learn.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction
- Microsoft Learn: Azure built-in roles for Storage — https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage
- Terraform Registry: `azurerm_storage_queue` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue
- Terraform Registry: `azurerm_storage_account` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- OpenTofu docs: `for` expressions — https://opentofu.org/docs/language/expressions/for/

## Issues Found
- The queue resources used `storage_account_name`, which is deprecated in the current AzureRM provider. Changed each queue resource to use `storage_account_id = azurerm_storage_account.storage.id` to match the current documented argument.
- The `queue_reader` RBAC example used the `Storage Queue Data Message Processor` built-in role while describing read-only access. Changed it to `Storage Queue Data Reader` because `Message Processor` can retrieve and delete messages, while `Data Reader` is the read-only queue role.

## Review Notes
- The `queue_properties` block on `azurerm_storage_account` is still supported in current AzureRM documentation for eligible storage account types, so no change was required there.
- The overview claims about 64 KB message size and queues holding millions of messages match current Microsoft Learn documentation.
