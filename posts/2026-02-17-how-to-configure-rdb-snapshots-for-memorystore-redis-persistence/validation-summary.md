# Validation Summary: How to Configure RDB Snapshots for Memorystore Redis Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Redis RDB snapshots
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring
- IAM

## Sources Consulted
- Google Cloud Memorystore for Redis: About RDB snapshots: https://docs.cloud.google.com/memorystore/docs/redis/about-rdb-snapshots
- Google Cloud Memorystore for Redis: Manage RDB snapshots: https://docs.cloud.google.com/memorystore/docs/redis/manage-rdb-snapshots
- Google Cloud SDK: `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud SDK: `gcloud redis instances update`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Google Cloud Memorystore for Redis: Supported monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Google Cloud IAM: Memorystore for Redis roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/redis

## Issues Found
- The post incorrectly stated that RDB persistence is only available on Standard tier and that Basic tier does not support persistence. Updated it to state that RDB snapshots are available for Memorystore for Redis instances running Redis 5.0 or later, including Basic tier, while Standard tier remains recommended for high availability.
- The post implied Standard tier snapshots are taken from the primary Redis process. Updated it to explain that Standard tier snapshots are taken from the replica to reduce impact on the primary node.
- The CLI examples used uppercase enum values for `--tier` and `--persistence-mode`. Updated examples to the documented lowercase values: `standard`, `rdb`, and `disabled`.
- The post claimed the persistence update command does not cause downtime. Removed the unsupported downtime guarantee and kept the documented behavior that snapshots start after the update completes.
- The post overstated snapshot scheduling and data-loss guarantees. Updated the language to reflect that RDB snapshots are best-effort, failed snapshots can make recovery data stale, and schedules can shift if snapshots fail or run longer than the interval.
- The monitoring section used an outdated or less-specific metric prefix and omitted the main RDB snapshot status metrics. Updated the command to list `redis.googleapis.com/rdb/` descriptors and added `snapshot/in_progress`, `snapshot/last_status`, and `snapshot/last_success_age`.
- The memory guidance said to keep memory utilization below 80%. Updated it to match Google guidance to set `maxmemory-gb` to 80% of instance capacity to reserve overhead for copy-on-write.
- The failover section mixed Basic and Standard behavior and overstated data-loss timing. Updated it to distinguish Basic tier snapshot recovery from Standard tier replica failover, and to state that data loss depends on replication lag.

## Review Notes
The local environment did not have `gcloud` installed, so command validation was performed against the official Google Cloud SDK command reference instead of local `--help` output.
