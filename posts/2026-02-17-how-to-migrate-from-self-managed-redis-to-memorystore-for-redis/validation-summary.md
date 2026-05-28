# Validation Summary: How to Migrate from Self-Managed Redis to Memorystore for Redis

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Cloud Storage
- Redis RDB snapshots and import/export
- redis-cli
- ioredis for Node.js
- redis-py for Python
- Google Cloud VPC networking and IAM

## Sources Consulted
- Google Cloud Memorystore for Redis import documentation: https://cloud.google.com/memorystore/docs/redis/import-data
- Google Cloud Memorystore for Redis import/export behavior: https://docs.cloud.google.com/memorystore/docs/redis/about-importing-exporting
- Google Cloud CLI reference for `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud Memorystore for Redis supported versions: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Google Cloud Memorystore for Redis supported configurations: https://docs.cloud.google.com/memorystore/docs/redis/supported-redis-configurations
- Google Cloud Memorystore for Redis high availability: https://cloud.google.com/memorystore/docs/redis/high-availability-for-memorystore-for-redis
- Google Cloud Memorystore for Redis networking: https://docs.cloud.google.com/memorystore/docs/redis/networking
- Google Cloud Memorystore for Redis IAM access control: https://cloud.google.com/memorystore/docs/redis/access-control
- Google Cloud Memorystore for Redis AUTH behavior: https://cloud.google.com/memorystore/docs/redis/about-redis-auth
- Google Cloud Memorystore for Redis monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Redis command documentation for `BGSAVE`, `LASTSAVE`, `DBSIZE`, and `INFO`: https://redis.io/docs/latest/commands/
- ioredis options documentation: https://redis.github.io/ioredis/
- redis-py connection documentation: https://redis.io/docs/latest/develop/clients/redis-py/connect/

## Issues Found
- The introduction implied Memorystore fully handles backups by default. Updated it to mention backup strategy and managed RDB snapshots when enabled.
- The post described "IAM-based access control" too broadly. Updated it to clarify that IAM controls management of Redis resources, while Redis AUTH is the optional data-plane authentication mechanism for clients.
- The provisioning guidance said to use the same Redis version without noting import compatibility. Updated it to allow the same or a newer supported destination version, matching Memorystore's RDB import constraints.
- The multiple-database note implied only DB 0 through DB 15. Updated it to note that 16 databases is the default and that higher database counts must be configured at instance creation.
- The RDB export example said to wait for `BGSAVE` by running `LASTSAVE` once. Updated it to record `LASTSAVE` before `BGSAVE` and poll until the timestamp changes.
- The import step did not mention that imports overwrite existing instance data or that newer-version RDB files cannot be imported into older Redis versions. Added those operational caveats.
- The ioredis example used `retryDelayOnFailover`, which is a cluster option and is not appropriate for a standalone Memorystore endpoint. Replaced it with a standalone `retryStrategy` and kept `maxRetriesPerRequest`.
- The application examples mentioned AUTH in comments but did not show where to set the credential. Added commented `password` fields for both ioredis and redis-py.
- The cleanup section suggested IAM permissions control service account access to the Redis instance. Updated it to refer to principals that can manage the instance and access the migration bucket.

## Review Notes
The overall migration approach is valid: create a Memorystore for Redis instance, export an RDB file from the source Redis deployment, upload it to Cloud Storage, import it with `gcloud redis instances import`, validate key counts and representative keys, then cut applications over through VPC connectivity. The post could later add more detail about Cloud Storage bucket region choice and service account permissions for imports, but the current content is technically correct after the fixes above.
