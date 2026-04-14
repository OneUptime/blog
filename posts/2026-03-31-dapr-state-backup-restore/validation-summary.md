# Validation Summary: How to Back Up and Restore Dapr State Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management HTTP API, component configuration)
- Redis (BGSAVE, RDB snapshots, redis-cli)
- PostgreSQL (pg_dump, pg_restore)
- Kubernetes (kubectl, StatefulSets, CronJobs, PVCs)
- Bash scripting

## Sources Consulted
- Dapr State Management HTTP API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Redis State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL State Store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr state key prefix / sharing docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Redis BGSAVE command documentation
- Redis CLI --rdb flag documentation
- Kubernetes StatefulSet behavior when scaling to 0 replicas
- kubectl cp requirements (running target pod)

## Issues Found

1. **BGSAVE described as "synchronous"** (line 89): The blog said "trigger a synchronous save" but `BGSAVE` is a background (asynchronous) save. `SAVE` would be synchronous. Changed to "trigger a background save".

2. **Dapr state save endpoint described as "PUT"** (line 132): The text said "Restore individual keys using the state PUT endpoint" but the Dapr state save API is POST, not PUT. The actual curl command in the code correctly used `-X POST`. Changed the description text to say "POST".

3. **Redis RDB restore procedure used kubectl cp on a non-existent pod** (lines 115-128): The original procedure scaled the StatefulSet to 0 replicas first, then tried `kubectl cp` to `redis-master-0`. When a StatefulSet is scaled to 0, all pods are deleted, so `kubectl cp` would fail with a "pod not found" error. Replaced with a correct procedure: copy the RDB file into the running pod, then delete the pod so the StatefulSet controller recreates it and Redis loads the restored RDB on startup.

4. **CronJob tried to copy RDB from local filesystem** (lines 231-234): The CronJob container sent `BGSAVE` to the remote Redis server, then ran `cp /data/dump.rdb /backup/...`. The RDB file is saved on the Redis server's filesystem, not in the CronJob container. The `/data` directory in the CronJob container would be empty. Replaced with `redis-cli --rdb` which downloads the RDB dump directly from the remote Redis server to a local file using the replication protocol.

## Review Notes
- The CronJob's `redis-cli --rdb` approach triggers a BGSAVE on the source server internally. For very large datasets this could impact Redis performance during the replication transfer.
- The blog correctly notes that Dapr does not provide a native backup command, which remains accurate.
- The `pg_dump`/`pg_restore` commands use `-t state` which targets the default Dapr PostgreSQL table name. This is correct for the default configuration but would need adjustment if a custom table name is configured.
- The Dapr key prefix pattern `appId||key` using `||` as separator is correct and accurately demonstrated in the verification section.
