# Validation Summary: How to Choose Azure Cache for Redis Tier

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Azure Cache for Redis (Basic, Standard, Premium, Enterprise tiers)
- Azure CLI (`az redis`, `az redisenterprise`)
- Terraform (`azurerm_redis_cache` resource)
- Redis persistence (RDB/AOF)
- Redis geo-replication

## Sources Consulted
- Azure Cache for Redis documentation: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/
- Azure Cache for Redis pricing tiers: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview#service-tiers
- Azure CLI `az redis` reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure CLI `az redisenterprise` reference: https://learn.microsoft.com/en-us/cli/azure/redisenterprise
- Azure Cache for Redis geo-replication: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-geo-replication
- Terraform azurerm_redis_cache resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache

## Issues Found

### 1. Enterprise SLA incorrectly stated as 99.9%
- **What was wrong:** The tier comparison table listed the Enterprise SLA as 99.9%.
- **What was changed:** Corrected to 99.99%, which is the documented SLA for Enterprise tier.

### 2. Enterprise tier incorrectly shown as supporting VNet injection
- **What was wrong:** The table listed VNet injection as "Yes" for Enterprise tier. Enterprise tier does not support VNet injection; it uses Private Link (Private Endpoints) instead. VNet injection is a Premium-only feature.
- **What was changed:** Changed Enterprise VNet injection column to "No (Private Link)".

### 3. C6 cache size listed as 53 GB
- **What was wrong:** C6 was listed as "53 GB cache (higher bandwidth)" in the VM Size Reference. C6 is actually 120 GB.
- **What was changed:** Corrected C6 to 120 GB. Also updated the max memory for Basic and Standard tiers in the comparison table from 53 GB to 120 GB, and updated all downstream references (cost optimization section, decision guide, summary) that cited 53 GB as the max.

### 4. Enterprise CLI command used `az redis create` instead of `az redisenterprise`
- **What was wrong:** The Enterprise tier example used `az redis create --sku Enterprise`, which is incorrect. Enterprise tier caches use a separate CLI command group (`az redisenterprise`).
- **What was changed:** Replaced with `az redisenterprise create` for the cluster and `az redisenterprise database create` for the database, with correct parameters including module specification.

### 5. Geo-replication section attributed to wrong tiers
- **What was wrong:** The section claimed "Standard supports passive geo-replication" and "Premium supports active geo-replication." Standard tier has no geo-replication support at all. Premium supports passive geo-replication, and Enterprise supports active geo-replication.
- **What was changed:** Corrected the section heading to "Premium vs Enterprise", updated the description to correctly attribute passive geo-replication to Premium and active geo-replication to Enterprise.

### 6. Geo-replication CLI command was incorrect
- **What was wrong:** The command `az redis geo-replication link` does not exist. The correct command for creating a Premium passive geo-replication link is `az redis server-link create`.
- **What was changed:** Replaced with `az redis server-link create` using the correct parameters (`--replication-role Secondary`, `--server-to-link`).

## Review Notes
- The Terraform configuration examples are correct for the `azurerm_redis_cache` resource (Basic/Standard/Premium tiers). Note that Enterprise tier would require the `azurerm_redis_enterprise_cluster` and `azurerm_redis_enterprise_database` resources, which are not shown — this could be a useful addition in the future.
- The cost figures are labeled as 2024 estimates. Readers should verify current pricing on the Azure pricing page.
- VNet injection for Premium tier is a legacy feature; Microsoft now recommends Private Link for all tiers. The post is technically correct but readers should be aware of this direction.
- The Enterprise tier section could benefit from mentioning Enterprise Flash as a separate SKU option in the CLI examples, since it is listed in the overview but not demonstrated.
