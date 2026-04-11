# Validation Summary: How to Provision Azure Cache for Redis with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cache for Redis
- Terraform (HashiCorp)
- AzureRM Terraform Provider (v3.114+)
- Azure Virtual Network (VNet injection)
- Azure Storage Account (for RDB backups)

## Sources Consulted
- Terraform AzureRM Provider `azurerm_redis_cache` docs (v3.90.0 and v3.114.0): https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- GitHub Issue #26943 — `enable_non_ssl_port` renamed to `non_ssl_port_enabled` in v3.114.0: https://github.com/hashicorp/terraform-provider-azurerm/issues/26943
- GitHub Issue #27146 — `enable_authentication` renamed to `authentication_enabled` in v3.114.0: https://github.com/hashicorp/terraform-provider-azurerm/issues/27146
- Azure Cache for Redis configuration docs (Microsoft Learn): https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-configure
- Azure Cache for Redis overview and tier comparison (Microsoft Learn): https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview

## Issues Found

1. **Provider version constraint too low for attribute names used**: The post specified `version = "~> 3.90"` but used `non_ssl_port_enabled`, which was introduced in v3.114.0 (renamed from `enable_non_ssl_port`). Using v3.90–3.113 would cause a Terraform error. **Fix**: Updated provider version to `~> 3.114`.

2. **`enable_authentication` renamed in v3.114+**: Since the provider version was bumped to `~> 3.114` to match `non_ssl_port_enabled`, the `enable_authentication` attribute inside `redis_configuration` should also use its new name `authentication_enabled` to avoid deprecation warnings. **Fix**: Renamed `enable_authentication` to `authentication_enabled`.

3. **`rdb_backup_enabled = false` on Standard tier**: The `rdb_backup_enabled` attribute is documented as "Only supported on Premium SKUs." Explicitly setting it (even to `false`) on a Standard SKU may cause a Terraform validation error depending on provider version. Since `false` is the default, it is redundant. **Fix**: Removed `rdb_backup_enabled = false` from the Standard tier example.

4. **Firewall rules tier availability comment inaccurate**: The code comment said "Standard/Premium tier" but Azure Cache for Redis firewall rules are available on all classic tiers (Basic, Standard, and Premium). **Fix**: Updated comment to "Basic, Standard, or Premium tier".

## Review Notes
- The capacity size comments (C0=250MB through C6=53GB, P1=6GB through P5=120GB) are accurate per Microsoft's documentation.
- The `patch_schedule` block is correctly used with Standard tier — it is supported on Basic, Standard, and Premium tiers (but not Enterprise/Enterprise Flash).
- The variables section defines `redis_sku` and `redis_capacity` but the main resource blocks use hardcoded values rather than referencing these variables. This is a pedagogical choice (showing concrete examples) and not a technical error.
- The post targets the AzureRM 3.x provider. AzureRM 4.x is available and includes breaking changes (removal of deprecated attribute names). The post remains valid for 3.x users but would need updates for a 4.x migration.
