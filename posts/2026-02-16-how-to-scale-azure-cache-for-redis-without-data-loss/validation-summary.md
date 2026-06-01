# Validation Summary: How to Scale Azure Cache for Redis Without Data Loss

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cache for Redis
- Azure CLI
- Redis clustering and sharding
- Azure Monitor metrics
- StackExchange.Redis for .NET
- redis-py for Python

## Sources Consulted
- Microsoft Learn: Scale an Azure Cache for Redis instance - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-scale
- Microsoft Learn: Azure CLI `az redis` reference - https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Configure Azure Cache for Redis, Import/Export - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-configure
- Microsoft Learn: Import and export data in Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data
- StackExchange.Redis configuration documentation - https://stackexchange.github.io/StackExchange.Redis/Configuration
- Redis documentation: redis-py production usage and retries - https://redis.io/docs/latest/develop/clients/redis-py/produsage/

## Issues Found
- The post said Azure Cache for Redis gives "three" scaling options but listed four. Changed this to "four."
- The Azure CLI scaling examples used `--sku` and uppercase `--vm-size` values for update operations. Updated the examples to use the current documented `az redis update --set "sku.capacity"=...` and `--set "sku.name"=... "sku.family"=...` patterns.
- The shard scaling examples used `--shard-count` with `az redis update`, but the current Azure CLI update examples use `--set shardCount=...`. Updated both shard examples.
- The scale-up process described a new node and DNS switchover. Updated the explanation to match Microsoft documentation: one replica is reprovisioned, data is transferred, failover occurs, then the other replica is reprovisioned.
- The downtime and duration estimates were too specific. Replaced them with Microsoft-documented behavior that Standard and Premium caches remain available with possible small connection blips, and that scaling duration depends on data size, write load, server load, and shard count.
- The scale-out duration estimate was too specific. Replaced it with the documented long-running-operation caveat and relevant factors.
- The post implied cross-slot multi-key operations fail specifically during rebalancing. Clarified that clustered Redis requires batched multi-key operations to target keys in the same shard generally, and suggested hash tags for related keys.
- The scale-down section said oversized data would make the operation fail. Updated it to the documented behavior that data can be lost and keys are evicted using `allkeys-lru` if the original data size exceeds the smaller target size.
- The Basic-to-Standard tier change section said data may not be preserved. Updated it to the documented behavior that data is typically preserved for Basic-to-Standard scaling, while Basic-to-Basic size changes lose all data.
- The Premium-to-Standard migration section said to export from Premium and import into Standard. Updated it because Azure Cache for Redis import is only available on Premium tier targets.
- The export/import example created a Standard target and then imported into it, which would not work. Changed the target cache to Premium.

## Review Notes
Azure Cache for Redis now has an announced retirement timeline, and Microsoft recommends migrating existing instances to Azure Managed Redis. The post remains technically relevant for existing Azure Cache for Redis users, but a future editorial update should consider adding migration context.
