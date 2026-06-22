# Validation Summary: How to Migrate from Self-Hosted Redis to Managed Redis

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Redis / Redis OSS
- redis-cli
- redis-py
- AWS ElastiCache
- Google Cloud Memorystore for Redis
- Azure Cache for Redis / Azure Managed Redis
- RedisShake
- Python

## Sources Consulted
- Redis MIGRATE command documentation: https://redis.io/docs/latest/commands/migrate/
- Redis RESTORE command documentation: https://redis.io/docs/latest/commands/restore/
- Redis DUMP command documentation: https://redis.io/docs/latest/commands/dump/
- redis-py Pub/Sub documentation: https://redis.readthedocs.io/en/stable/advanced_features.html
- AWS ElastiCache seeding from externally created backups: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-seeding-redis.html
- AWS CLI create-replication-group reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS ElastiCache online migration documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/OnlineMigration.html
- AWS CLI start-migration reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/start-migration.html
- AWS CLI complete-migration reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/complete-migration.html
- AWS ElastiCache automatic backups documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups-automatic.html
- Google Cloud gcloud redis instances import reference: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/import
- Google Cloud Memorystore import data documentation: https://docs.cloud.google.com/memorystore/docs/redis/import-data
- Google Cloud Memorystore supported and blocked commands: https://docs.cloud.google.com/memorystore/docs/redis/supported-commands
- Azure Cache for Redis persistence documentation: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence
- Azure Managed Redis persistence documentation: https://learn.microsoft.com/en-us/azure/redis/how-to-persistence
- RedisShake migration mode documentation: https://tair-opensource.github.io/RedisShake/en/guide/mode.html
- RedisShake GitHub documentation: https://github.com/tair-opensource/RedisShake

## Issues Found
- The managed-service benefits claimed point-in-time recovery generally. Changed this to snapshot-based recovery because Redis managed services commonly provide scheduled/manual snapshot restore rather than universal point-in-time recovery.
- The Google Cloud Memorystore import command had positional arguments in the wrong order. Updated it to `gcloud redis instances import SOURCE INSTANCE --region=REGION`, matching the official gcloud reference.
- The MIGRATE example omitted authentication and replacement handling while targeting a managed Redis instance. Added `AUTH` and `REPLACE`, and added a caveat that TLS-only targets or services blocking MIGRATE should use DUMP/RESTORE instead.
- The backfill example assigned `key_type` but never used it. Removed the unused assignment to keep the example accurate and clean.
- The AWS replication example used ElastiCache Global Datastore for self-hosted-to-managed replication. Replaced it with the ElastiCache online migration CLI flow, which is the AWS feature documented for self-hosted Redis OSS to ElastiCache migration.
- The RedisShake configuration used non-current `[source]`, `[target]`, and `[sync]` sections. Updated it to the documented `[sync_reader]` and `[redis_writer]` format.
- The Pub/Sub migration helper returned the result of `subscribe()` instead of returning a usable PubSub object. Updated it to create a PubSub object, subscribe, and return the object.
- The cluster migration snippet referenced `redis.Redis` without importing `redis` in that standalone code block. Added the missing import.

## Review Notes
The Python code blocks were parsed with Python `ast` after edits and are syntactically valid. Local `redis-cli`, `aws`, `gcloud`, and `redis` Python package binaries were not installed in the environment, so CLI verification was performed against official documentation instead of local `--help` output.
