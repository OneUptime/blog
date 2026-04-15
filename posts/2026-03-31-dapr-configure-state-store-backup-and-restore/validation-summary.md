# Validation Summary: How to Configure State Store Backup and Restore with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management, State API)
- Redis (RDB snapshotting, AOF persistence, redis-cli)
- Kubernetes (kubectl, CronJob, StatefulSet)

## Sources Consulted
- Dapr State Management component spec for Redis: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Redis persistence documentation (RDB/AOF): https://redis.io/docs/management/persistence/
- Redis CLI documentation (BGSAVE, SAVE, LASTSAVE, --rdb flag): https://redis.io/docs/manual/cli/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
1. **Line 54 — "synchronous save" mislabeled**: The text described the `BGSAVE` command as forcing "a synchronous save," but `BGSAVE` performs an asynchronous background save. The synchronous variant is `SAVE`, which blocks the Redis server. The command used (`BGSAVE`) is the correct choice for production use; only the description was wrong. Fixed by changing "synchronous" to "background."

## Review Notes
- The CronJob example calls `redis-cli -h redis-master BGSAVE` followed by `redis-cli -h redis-master --rdb ...`. The `--rdb` flag itself initiates a BGSAVE on the server before downloading the dump, making the explicit BGSAVE call redundant. This is not harmful but is slightly redundant.
- The CronJob example does not include a volume mount for `/backup`, so the downloaded RDB file would be written to ephemeral container storage and lost when the pod terminates. A PersistentVolumeClaim or external storage upload step would be needed in practice. This is acceptable for an illustrative example but worth noting.
- The Dapr component YAML, Redis persistence configuration, Dapr State API endpoints (single get and bulk get), kubectl commands, and Kubernetes resource specs are all technically correct.
