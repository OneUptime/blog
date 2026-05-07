# Validation Summary: How to Configure Azure Storage Lifecycle Management with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Blob Storage lifecycle management
- Azure Storage accounts
- OpenTofu
- HCL
- AzureRM provider

## Sources Consulted
- Microsoft Learn: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview
- Microsoft Learn: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Terraform Registry: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform Registry: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_management_policy

## Issues Found
- The storage account comment said lifecycle management works with all replication types. That is too broad for the archive action used in the example, because Azure does not support archive-tier lifecycle transitions on ZRS, GZRS, or RA-GZRS accounts. I corrected the comment to describe why `GRS` is a valid choice for this example.
- The first lifecycle rule comment said blobs would move to Cool after 30 days of no access, but the code uses `tier_to_cool_after_days_since_modification_greater_than`, which is based on last modification time, not last access time. I corrected the comments in that rule to describe modification-based behavior accurately.
- The prefix-filter explanation did not make it clear that Azure lifecycle `prefixMatch` values must start with a container name. I clarified the prose and inline comments so the `logs/` and `temp/` examples are interpreted correctly.

## Review Notes
- Azure lifecycle policy updates can take up to 24 hours before the first run starts after a change.
- Last access time tracking is updated at most once every 24 hours per blob, which affects how quickly access-based rules react.
- Azure also supports the Cold tier now, but the post’s Hot/Cool/Archive examples remain technically valid.
