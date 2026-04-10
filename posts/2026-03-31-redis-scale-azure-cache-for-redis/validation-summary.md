# Validation Summary: How to Scale Azure Cache for Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cache for Redis
- Azure CLI (`az redis`)
- Terraform (AzureRM provider, `azurerm_redis_cache`)
- Python (`redis`, `tenacity`)

## Sources Consulted
- Azure CLI `az redis` reference: https://learn.microsoft.com/en-us/cli/azure/redis?view=azure-cli-latest
- Scale an Azure Cache for Redis instance: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-scale
- Azure Cache for Redis pricing and sizes: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-configure
- Terraform AzureRM `azurerm_redis_cache` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache

## Issues Found

1. **Scaling operations table: Basic to Standard / Standard to Premium swapped** — The table listed "Basic to Standard" as "Brief reconnect" and "Standard to Premium" as "Yes - data may be lost". This was backwards. Basic tier has no replication, so scaling from Basic to Standard may lose data. Standard to Premium preserves data (Standard has replication) and only causes a brief reconnect. Fixed the table entries and the corresponding summary paragraph.

2. **CLI `az redis show` query used non-existent `vmSize` property** — The JMESPath query `{Size:vmSize,State:provisioningState}` referenced `vmSize`, which does not exist in the `az redis show` output. The cache size information is under `sku.name`, `sku.family`, and `sku.capacity`. Fixed to `{Sku:sku.name,Family:sku.family,Capacity:sku.capacity,State:provisioningState}`.

3. **`--shard-count` is not a named parameter for `az redis update`** — The command used `--shard-count 4` but this is not a supported named parameter on `az redis update`. The correct approach is `--set shardCount=4`. Fixed.

4. **Sizing table memory values shifted by one tier** — C2 was listed as 6 GB (actually 2.5 GB), C3 as 13 GB (actually 6 GB), C4 as 26 GB (actually 13 GB), C5 as 53 GB (actually 26 GB). The values were shifted up by one tier starting at C2. Also added the missing C6 (53 GB) row. Fixed all values.

5. **Section heading "Scaling via Azure Portal (Terraform)"** — Terraform is not the Azure Portal. Changed to "Scaling via Terraform".

6. **Deprecated Terraform attribute `enable_non_ssl_port`** — This attribute was deprecated in AzureRM provider v3.x and removed in v4.x. Replaced with the current attribute name `non_ssl_port_enabled`.

## Review Notes
- Pricing values in the sizing table are labeled as approximate and will change over time. They appear to be in the right ballpark but readers should check current Azure pricing.
- The `tenacity` Python retry example is correct and demonstrates good practice for handling brief disconnects during scaling.
- The `az redis update --vm-size` parameter is valid per current Azure CLI documentation.
