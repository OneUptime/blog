# How to Configure State Store Backup and Restore with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Backup, Restore, Redis

Description: Learn how to back up and restore Dapr state store data using Redis persistence, snapshots, and migration strategies to protect stateful application data.

---

## Overview

Dapr abstracts state management across various backends, but protecting that state from loss requires explicit backup and restore strategies. Whether you use Redis, PostgreSQL, or Azure Cosmos DB as your backing store, this guide walks you through practical backup approaches.

## Enabling Redis Persistence for Dapr State

When Redis is your Dapr state store, enable RDB snapshotting and AOF logging:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "false"
```

Configure Redis itself with persistence:

```bash
# In redis.conf
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
dir /data
dbfilename dump.rdb
```

## Triggering a Manual Backup

Use `redis-cli` to force a background save:

```bash
kubectl exec -it redis-master-0 -- redis-cli BGSAVE
# Wait for background save to complete
kubectl exec -it redis-master-0 -- redis-cli LASTSAVE
```

Copy the dump file out of the pod:

```bash
kubectl cp redis-master-0:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

## Restoring State Store Data

To restore from a backup, stop writes, copy the RDB file back, and restart:

```bash
# Scale down your app to stop writes
kubectl scale deployment my-app --replicas=0

# Copy backup into Redis pod
kubectl cp ./redis-backup-20260331.rdb redis-master-0:/data/dump.rdb

# Restart Redis
kubectl rollout restart statefulset redis-master

# Scale your app back up
kubectl scale deployment my-app --replicas=3
```

## Using Dapr State API for Selective Export

You can export specific keys via the Dapr State API before a migration:

```bash
# Get a specific state key
curl http://localhost:3500/v1.0/state/statestore/user-session-abc123

# Bulk get with POST
curl -X POST http://localhost:3500/v1.0/state/statestore/bulk \
  -H "Content-Type: application/json" \
  -d '{"keys": ["user-session-abc123", "cart-456"], "parallelism": 10}'
```

## Automating Backups with a CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dapr-state-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: redis:7-alpine
            command:
            - /bin/sh
            - -c
            - |
              redis-cli -h redis-master BGSAVE
              sleep 5
              redis-cli -h redis-master --rdb /backup/dump-$(date +%Y%m%d).rdb
          restartPolicy: OnFailure
```

## Summary

Backing up Dapr state store data requires configuring your underlying store (Redis RDB/AOF, PostgreSQL pg_dump, etc.) for persistence and then scheduling periodic exports. Use the Dapr State API for selective key migration and Kubernetes CronJobs for automated backups. Always test your restore process in a staging environment before relying on it in production.
