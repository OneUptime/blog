# Validation Summary: How to Create Azure Cache for Redis with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Azure Cache for Redis
- AzureRM Terraform provider (~> 3.0)
- Azure Virtual Network (VNet) integration
- Redis geo-replication via linked servers

## Sources Consulted
- AzureRM provider `azurerm_redis_cache` resource documentation (v3.0.0): https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.0.0/website/docs/r/redis_cache.html.markdown
- AzureRM provider `azurerm_redis_firewall_rule` resource documentation
- AzureRM provider `azurerm_redis_linked_server` resource documentation
- AzureRM provider `azurerm_redis_enterprise_cluster` resource documentation (to confirm Enterprise tier uses a separate resource)

## Issues Found

1. **Invalid `sku_name` value listed in comment.** The comment for `sku_name` listed `"Basic, Standard, Premium, Enterprise"`. The `azurerm_redis_cache` resource only supports `Basic`, `Standard`, and `Premium`. Enterprise tier requires a separate resource (`azurerm_redis_enterprise_cluster`). Fixed by removing `Enterprise` from the comment.

2. **Incorrect unit for `maxmemory_reserved`.** The inline comment described the value as a "Percentage of memory reserved for non-cache". Per the provider documentation, `maxmemory_reserved` (and `maxfragmentationmemory_reserved`) are values in **megabytes**, not percentages. Fixed the comment to say "Megabytes reserved for non-cache usage".

## Review Notes
- The post pins the azurerm provider to `~> 3.0`. In azurerm v4.x, `enable_non_ssl_port` was renamed to `non_ssl_port_enabled`. The post's usage is correct for the pinned version, but readers upgrading to v4.x will need to update this attribute (along with several other renamings in the v4 provider).
- The `azurerm_redis_linked_server` example correctly creates the linked server on the primary cache with the secondary as the linked cache and `server_role = "Secondary"`, which matches the provider semantics.
- `maxmemory_reserved = 2` and `maxmemory_delta = 2` (in MB) are technically valid but very small for a Premium cache; defaults are higher in practice. This is a stylistic/operational concern, not a technical error.
- The `azurerm_subnet.redis` reference in the VNet example assumes the reader has defined the subnet elsewhere; this is a typical snippet pattern and not an error.
