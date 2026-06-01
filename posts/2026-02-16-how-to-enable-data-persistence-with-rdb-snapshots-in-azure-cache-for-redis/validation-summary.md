# Validation Summary: How to Enable Data Persistence with RDB Snapshots in Azure Cache for Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cache for Redis
- Redis RDB persistence
- Redis AOF persistence
- Azure Storage
- Azure CLI
- Azure Monitor metrics alerts
- redis-cli

## Sources Consulted
- Microsoft Learn: Data persistence - Azure Cache for Redis: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence
- Microsoft Learn: Azure CLI `az redis create` and `az redis update` reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Azure Monitor `az monitor metrics alert create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure Cache for Redis monitoring data reference: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/monitor-cache-reference
- Microsoft Learn: Supported metrics for Microsoft.Cache/redis: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-cache-redis-metrics
- Redis documentation: Redis persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found
- Premium-tier RDB persistence was described as using Azure-managed storage by default. Microsoft documentation states Premium-tier persistence uses an Azure Storage account that the user owns and manages. Updated prerequisites, portal steps, storage section, and best practices accordingly.
- The create-cache examples enabled RDB persistence without specifying `rdb-storage-connection-string`. Azure CLI documentation for Premium-tier RDB persistence includes the storage connection string in `redisConfiguration`. Updated the examples to create/use a Redis configuration JSON file containing the storage connection string.
- The `az redis create` examples used `--enable-non-ssl-port false`, but the Azure CLI option is a presence flag for enabling the non-TLS port. Removed it from examples that intend to keep the non-TLS port disabled.
- The examples used `--vm-size P1`; Azure CLI documentation shows the Premium size value as `p1`. Updated the examples to use `p1`.
- The storage guidance said Standard storage should be used because Premium storage is unnecessary. Microsoft documentation recommends Premium storage for higher throughput. Updated the guidance to match the official recommendation.
- The storage guidance omitted the hierarchical namespace limitation for RDB page blobs. Added a note not to use HNS-enabled accounts such as Azure Data Lake Storage Gen2.
- The Azure Monitor alert example used `--action-group`, which is not the documented parameter for `az monitor metrics alert create`. Updated it to `--action`.
- The alert condition watched all Redis errors instead of specifically targeting RDB persistence errors. Updated it to use the `errors` metric with the `ErrorType` dimension set to `RDB`.

## Review Notes
Azure CLI was not installed in the local environment, so CLI command verification was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output. Microsoft documentation also notes Azure Cache for Redis retirement planning; the post remains technically valid for Azure Cache for Redis Premium persistence, but future revisions should consider whether Azure Managed Redis is the better target service.
