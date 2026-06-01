# Validation Summary: How to Configure AOF Persistence in Azure Cache for Redis Premium Tier

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cache for Redis Premium
- Azure Managed Redis
- Redis AOF and RDB persistence
- Azure Storage accounts
- Azure CLI
- Azure Monitor metric alerts

## Sources Consulted
- Microsoft Learn: Data persistence in Azure Cache for Redis - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence
- Microsoft Learn: Azure Cache for Redis retirement FAQ - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/retirement-faq
- Microsoft Learn: Azure CLI `az redis` reference - https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Create an Azure storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn: Azure Monitor metric alerts CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure Cache for Redis monitoring data reference - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/monitor-cache-reference
- Redis docs: Redis persistence - https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found
- Corrected the availability scope. The post said AOF persistence was only available on Premium; Microsoft documentation also lists Enterprise and Enterprise Flash persistence support in preview, while Basic and Standard do not support persistence.
- Added the current Azure Cache for Redis retirement caveat for Basic, Standard, and Premium tiers, which retire on September 30, 2028.
- Fixed the cache creation command by removing `--shard-count 0`. Current Azure CLI documentation uses positive shard counts to enable clustering; omitting the option creates a non-clustered cache.
- Updated the storage account recommendation from Standard_LRS to Premium_LRS because Microsoft recommends Premium storage for higher persistence throughput.
- Corrected the portal and fsync guidance. Current Microsoft documentation describes Premium AOF persistence as saving write operations once per second; it does not document a Premium setting to choose "Every write", and the always-write option is retired for Enterprise and Enterprise Flash.
- Removed unsupported exact performance and recovery estimates, including fixed latency impact percentages and a 10 GB recovery time estimate.
- Corrected monitoring guidance to use documented metrics such as `allcacheWrite`, `serverLoad`, `usedmemorypercentage`, `usedmemoryRss`, and `Errors`, and clarified that the `Errors` metric includes AOF persistence errors.
- Replaced unsupported claims about silent persistence stoppage and AOF corruption fallback behavior with the documented limitation that persistence is not backup or point-in-time recovery.

## Review Notes
The Azure CLI executable was not installed in the local environment, so command verification was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output.
