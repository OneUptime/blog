# Validation Summary: How to Configure Azure Cache for Redis Data Persistence

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Azure Cache for Redis (Premium tier)
- Redis RDB persistence
- Redis AOF persistence
- Azure CLI (`az redis create`, `az redis update`, `az redis show`)
- Azure Blob Storage (for persistence data)
- Terraform (azurerm provider — `azurerm_redis_cache`, `azurerm_storage_account`)
- Python Azure SDK (`azure-mgmt-redis`, `azure-identity`)

## Sources Consulted
- Azure Cache for Redis data persistence documentation (https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence)
- Azure CLI `az redis` command reference (https://learn.microsoft.com/en-us/cli/azure/redis)
- Terraform azurerm_redis_cache resource documentation (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache)
- Redis official documentation on persistence (https://redis.io/docs/management/persistence/)
- Azure SDK for Python azure-mgmt-redis reference

## Issues Found
1. **RDB acronym expansion**: The post stated "RDB (Redis Database Backup)". RDB stands for "Redis Database" — the dump file format. "Backup" is not part of the acronym. Fixed to "RDB (Redis Database)".
2. **Persistence tier availability**: The post stated "Persistence is only available on the Premium tier." This is incomplete — Enterprise and Enterprise Flash tiers also support persistence (Enterprise supports RDB and AOF; Enterprise Flash supports RDB only). Updated the note to mention Enterprise tiers while clarifying that the guide covers Premium tier configuration.

## Review Notes
- The Azure CLI commands (`az redis create`, `az redis update`, `az redis show`) use correct flags and parameter formats for Premium tier persistence configuration.
- The RDB backup frequency values (15, 30, 60, 360, 720, 1440 minutes) are correct per Azure documentation.
- The Terraform `azurerm_redis_cache` resource attributes (`rdb_backup_enabled`, `rdb_backup_frequency`, `rdb_backup_max_snapshot_count`, `rdb_storage_connection_string`, `aof_backup_enabled`, `aof_storage_connection_string_0`, `aof_storage_connection_string_1`) are correct for the azurerm provider.
- The Python SDK code correctly uses `RedisManagementClient` and accesses `redis_configuration` attributes with proper snake_case names.
- Storage cost estimates are approximate but reasonable for Azure Blob Storage pricing.
- The `maxmemory_policy = "noeviction"` recommendation for persistence-backed caches is a sound best practice.
