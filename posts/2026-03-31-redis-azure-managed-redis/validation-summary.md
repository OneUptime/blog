# Validation Summary: How to Set Up Azure Managed Redis

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Azure Managed Redis (AMR)
- Azure CLI (`az redisenterprise`)
- ARM Templates (Microsoft.Cache/redisEnterprise)
- Terraform (azurerm_redis_enterprise_cluster, azurerm_redis_enterprise_database)
- Python redis-py client
- Redis 7.4

## Sources Consulted
- Microsoft Learn: az redisenterprise create CLI reference — https://learn.microsoft.com/en-us/cli/azure/redisenterprise
- Microsoft Learn: What is Azure Managed Redis? (SKU overview) — https://learn.microsoft.com/en-us/azure/redis/overview
- Microsoft Learn: Quickstart - Create an Azure Managed Redis instance — https://learn.microsoft.com/en-us/azure/redis/quickstart-create-managed-redis
- Microsoft Learn: Microsoft.Cache/redisEnterprise ARM template reference — https://learn.microsoft.com/en-us/azure/templates/microsoft.cache/redisenterprise
- Microsoft Learn: Microsoft.Cache/redisEnterprise 2025-04-01 — https://learn.microsoft.com/en-us/azure/templates/microsoft.cache/2025-04-01/redisenterprise
- Microsoft Learn: Scale an Azure Managed Redis instance (SKU sizes) — https://learn.microsoft.com/en-us/azure/redis/how-to-scale
- Microsoft Learn: Azure Managed Redis migration guide — https://learn.microsoft.com/en-us/azure/redis/cache-how-to-upgrade
- Terraform Registry: azurerm_redis_enterprise_cluster — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_enterprise_cluster
- Terraform Registry: azurerm_redis_enterprise_database — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_enterprise_database

## Issues Found

### 1. Wrong CLI command (Critical)
**What was wrong:** The post used `az redis create` which is the command for the older Azure Cache for Redis (Basic/Standard/Premium tiers), not Azure Managed Redis.
**What was changed:** Replaced with `az redisenterprise create` in both the creation and zone redundancy CLI examples.
**Why:** Azure Managed Redis uses the `az redisenterprise` command group (requires Azure CLI 2.75.0+). `az redis` commands only work with the legacy Basic/Standard/Premium tiers.

### 2. Wrong SKU format in CLI (Critical)
**What was wrong:** The CLI examples used `BalancedB5` (no underscore).
**What was changed:** Replaced with `Balanced_B5` (underscore-separated).
**Why:** The `az redisenterprise create --sku` parameter requires the underscore format: `Balanced_B5`, not `BalancedB5`.

### 3. Wrong zone redundancy flag (Moderate)
**What was wrong:** The zone redundancy example used `--availability-zones 1 2 3`.
**What was changed:** Replaced with `--zones "1" "2" "3"`.
**Why:** The `az redisenterprise create` command uses `--zones` (or `-z`), not `--availability-zones`.

### 4. Wrong ARM template API version (Critical)
**What was wrong:** The ARM template used `apiVersion: "2024-02-01"` with a `Balanced_B5` SKU.
**What was changed:** Updated to `apiVersion: "2025-04-01"`.
**Why:** API version `2024-02-01` only supports the older Enterprise/EnterpriseFlash SKU names. The new AMR SKU names (Balanced_*, MemoryOptimized_*, etc.) require API version `2025-04-01` or newer.

### 5. Incorrect SKU max memory values (Moderate)
**What was wrong:** The SKU table listed incorrect max memory values: Memory Optimized (1.5 TB), Balanced (120 GB), Compute Optimized (96 GB), Flash Optimized (1.5 TB).
**What was changed:** Updated to correct values: Memory Optimized (2 TB), Balanced (960 GB), Compute Optimized (720 GB), Flash Optimized (4.5 TB).
**Why:** The values were significantly understated compared to the actual Azure Managed Redis SKU offerings.

### 6. Incorrect hostname format (Critical)
**What was wrong:** The Python connection example used `redisenterprise.cache.azure.net` as the DNS suffix.
**What was changed:** Replaced with `redis.azure.net`.
**Why:** Azure Managed Redis uses the `<name>.<region>.redis.azure.net` hostname format. The `redisenterprise.cache.azure.net` suffix was used by the older Azure Cache for Redis Enterprise tier.

### 7. Incorrect geo-replication claim (Moderate)
**What was wrong:** The post claimed "Active geo-replication available on all SKUs."
**What was changed:** Updated to "Active geo-replication available on most SKUs (except Balanced B0, B1, and Flash Optimized)."
**Why:** Per official documentation, Balanced B0, B1, and Flash Optimized SKUs do not support active geo-replication.

## Review Notes
- The Terraform example uses `azurerm_redis_enterprise_cluster` which works but is now considered legacy. A newer resource `azurerm_managed_redis` was added in azurerm provider v4.50.0 (October 2025) specifically for Azure Managed Redis. A future update could migrate to the newer resource.
- The Python example uses access key authentication. Microsoft now recommends Entra ID authentication as the default. Access keys still work but are considered a legacy option.
- The `ssl_cert_reqs=ssl.CERT_REQUIRED` parameter in the Python example is not shown in official Microsoft documentation but is not harmful — it explicitly enforces certificate validation which is good security practice.
- The post states Azure Managed Redis was "launched in 2024" — more precisely, it entered public preview in November 2024 at Microsoft Ignite and reached GA in May 2025.
- RediSearch module is not available on the Flash Optimized tier, which could be noted in the modules support claim.
