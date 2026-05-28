# Validation Summary: How to Migrate Azure Redis Cache to Google Cloud Memorystore for Redis

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Cache for Redis
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Azure CLI
- Redis CLI
- Redis RDB import/export
- Redis Python client
- Node.js Redis client
- RIOT
- Cloud Run Direct VPC egress and Serverless VPC Access
- Cloud Monitoring

## Sources Consulted
- Google Cloud Memorystore for Redis supported versions: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Google Cloud Memorystore for Redis instances and capacity: https://cloud.google.com/memorystore/docs/redis/instances
- Google Cloud Memorystore for Redis tiers and read replicas: https://cloud.google.com/memorystore/docs/redis/redis-tiers
- Google Cloud Memorystore for Redis networking: https://cloud.google.com/memorystore/docs/redis/networking
- Google Cloud Memorystore for Redis in-transit encryption: https://cloud.google.com/memorystore/docs/redis/about-in-transit-encryption
- Google Cloud Memorystore for Redis import/export behavior: https://cloud.google.com/memorystore/docs/redis/about-importing-exporting
- Google Cloud CLI `gcloud redis instances create`: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud CLI `gcloud redis instances import`: https://cloud.google.com/sdk/gcloud/reference/redis/instances/import
- Cloud Run Direct VPC egress: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Cloud Monitoring policy creation CLI: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Memorystore monitoring metrics: https://cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Microsoft Learn Azure Cache for Redis overview, tiers, versions, and retirement notice: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Microsoft Learn Azure Cache for Redis import/export: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-import-export-data
- Azure CLI `az redis export`: https://learn.microsoft.com/en-us/cli/azure/redis
- RIOT documentation: https://redis.github.io/riot/
- redis-py documentation: https://redis.readthedocs.io/
- node-redis documentation: https://redis.js.org/

## Issues Found
- Updated the Azure Cache for Redis service comparison to reflect current tier and version information, including Enterprise Flash and the Azure Cache for Redis retirement timeline.
- Corrected the Memorystore comparison: Basic/Standard instances do not provide Redis Cluster; Memorystore for Redis Cluster is a separate product, and Standard read replicas must be enabled.
- Fixed the Memorystore AUTH flag reference from `--auth-enabled` to `--enable-auth`.
- Added the private services access prerequisite for `--connect-mode=PRIVATE_SERVICE_ACCESS`.
- Corrected Azure export guidance to show that the default Azure CLI export flow expects a SAS container URL, and added a blob listing step because exported blob names can use the specified prefix rather than a fixed local filename.
- Added the Memorystore RDB import version compatibility caveat: the target Redis version must be the same as or newer than the source RDB version.
- Updated the RIOT example to use Redis URI arguments, which match current RIOT `replicate` syntax.
- Updated the Monitoring alert to use the recommended `system_memory_usage_ratio` metric and valid `gcloud monitoring policies create` threshold flags.

## Review Notes
The post is technically relevant and implementation-focused. The Python migration script is suitable as an example, but a production migration should also account for clustered source caches, large keys, duplicate stream IDs on retries, and write consistency during cutover.
