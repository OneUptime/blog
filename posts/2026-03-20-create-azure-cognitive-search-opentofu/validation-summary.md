# Validation Summary: How to Create Azure Cognitive Search with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Azure AI Search (formerly Azure Cognitive Search)
- AzureRM provider (`hashicorp/azurerm` ~> 3.0)
- Azure Resource Manager resources: `azurerm_search_service`, `azurerm_search_shared_private_link_service`, `azurerm_private_endpoint`, `azurerm_role_assignment`
- Azure RBAC built-in roles for Search (Search Service Contributor, Search Index Data Contributor, Search Index Data Reader)
- Azure Private Link / private endpoints

## Sources Consulted
- AzureRM provider docs for `azurerm_search_service`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/search_service
- AzureRM provider source (`internal/services/search/search_service_resource.go`) for the canonical `ValidateFunc` enums of `hosting_mode` and `authentication_failure_mode`
- AzureRM provider docs for `azurerm_search_shared_private_link_service`
- Microsoft Learn — Service Limits for Tiers and SKUs (Azure AI Search): https://learn.microsoft.com/en-us/azure/search/search-limits-quotas-capacity
- Microsoft Learn — Azure built-in roles for AI Search

## Issues Found
1. **Incorrect partition storage value for Standard (S1).** The post originally claimed `1 partition = 15 GB storage` for the `standard` SKU. According to Microsoft's published partition-storage table, S1 partitions are 25 GB (services created before April 3, 2024) or up to 160 GB (services created after April 3, 2024 in supported regions). 15 GB is actually the per-partition number for the **Basic** tier on newer services — wrong tier entirely. Updated the inline comment to reflect both the legacy and current S1 partition sizes.
2. **Incorrect partition storage math for Standard 3 (S3).** The post originally claimed `3 partitions = 450 GB storage`. S3 partitions are 200 GB on older services (3 × 200 = 600 GB) or up to 1 TB on services created after April 3, 2024 in supported regions (3 × 1 TB ≈ 3 TB). 450 GB is not produced by any combination of valid S3 partition sizes. Updated the inline comment to cite the per-partition figures (200 GB legacy / up to 1 TB current).
3. **Invalid `authentication_failure_mode` alternate value in the inline comment.** The comment read `# or http401`. The AzureRM provider's `ValidateFunc` only accepts `"http401WithBearerChallenge"` or `"http403"` (verified from the provider source). Plain `"http401"` would fail validation. Updated the comment to `# or "http401WithBearerChallenge"`.

## Review Notes
- `authentication_failure_mode` is documented as only effective when `local_authentication_enabled = true`. The example sets `local_authentication_enabled = false` and still shows `authentication_failure_mode = "http403"` — the field is accepted by the provider schema, but it has no runtime effect in this configuration. Left in place since the value itself is now valid and the line is illustrative; readers who fully disable local auth can omit it.
- `hosting_mode` valid values are lowercase `"default"` and `"highDensity"` (verified from provider source); the post uses these correctly.
- `partition_count` accepts only `1, 2, 3, 4, 6, 12` per the provider — the values used in the post (1 and 3) are valid.
- The S3 max replicas/partitions claim ("Up to 12 replicas and 12 partitions") is correct per Microsoft's service-limits table.
- Built-in role names ("Search Service Contributor", "Search Index Data Contributor", "Search Index Data Reader"), the private endpoint subresource name (`searchService`), and the shared private link `subresource_name = "blob"` for a storage account target are all correct.
- The `primary_key` attribute on `azurerm_search_service` exists and is correctly marked `sensitive = true` in the output.
- Author references `azurerm_subnet.private`, `azurerm_user_assigned_identity.app/.frontend`, and `azurerm_storage_account.data` without defining them — these are standard cross-reference patterns for a focused tutorial and not technical errors, but readers will need to define them in their own configuration.
- Partition storage limits change over time and by region; the corrected comments cite both the pre– and post–April 3, 2024 figures for accuracy.
