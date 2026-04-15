# How to Configure Dapr Backup and Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Backup, Disaster Recovery, Kubernetes, State Store

Description: Learn how to back up Dapr state stores, component definitions, and configurations to enable fast disaster recovery for production Dapr deployments.

---

Disaster recovery for Dapr involves backing up two categories of data: Dapr configuration resources (components, subscriptions, configurations) stored as Kubernetes CRDs, and the underlying state store data used by your applications.

## Backing Up Dapr Kubernetes Resources

Export all Dapr custom resources to YAML files:

```bash
#!/bin/bash
BACKUP_DIR="./dapr-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Back up all Dapr CRDs and resources
for resource in components configurations subscriptions resiliencies httpendpoints; do
  kubectl get "$resource" --all-namespaces -o yaml \
    > "$BACKUP_DIR/${resource}.yaml"
  echo "Backed up $resource"
done

# Back up Dapr system namespace resources
kubectl get all -n dapr-system -o yaml > "$BACKUP_DIR/dapr-system.yaml"
echo "Backup complete: $BACKUP_DIR"
```

## Scheduling Automated Backups with CronJob

Run the backup script on a schedule using a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dapr-resource-backup
  namespace: dapr-system
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: dapr-backup-sa
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              for r in components configurations subscriptions; do
                kubectl get $r --all-namespaces -o yaml \
                  > /backup/${r}-$(date +%Y%m%d).yaml
              done
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: dapr-backup-pvc
          restartPolicy: OnFailure
```

## Backing Up Redis State Store

For Redis-backed Dapr state stores, use Redis persistence and periodic RDB snapshots:

```bash
# Enable AOF persistence in Redis config
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET appendfsync everysec

# Trigger an RDB snapshot
redis-cli BGSAVE

# Copy the dump to S3
aws s3 cp /var/lib/redis/dump.rdb \
  s3://my-bucket/dapr-state/dump-$(date +%Y%m%d).rdb
```

## Restoring Dapr Resources

To restore from backup after a cluster rebuild:

```bash
# 1. Reinstall Dapr
dapr init -k

# 2. Restore component definitions
kubectl apply -f ./dapr-backup-20260101/components.yaml
kubectl apply -f ./dapr-backup-20260101/configurations.yaml
kubectl apply -f ./dapr-backup-20260101/subscriptions.yaml

# 3. Verify components are loaded
dapr components -k
```

## Testing Your Recovery Plan

Validate your backup and restore process in a staging cluster before a real disaster strikes:

```bash
# Create a test namespace
kubectl create namespace dapr-dr-test

# Apply backed-up resources to test namespace
kubectl apply -f components.yaml -n dapr-dr-test

# Verify components appear
kubectl get components -n dapr-dr-test
```

Document the recovery time objective (RTO) measured during these drills and set it as your operational target.

## Multi-Region Disaster Recovery

For multi-region DR, replicate state stores across regions using native replication:

```yaml
# Redis Sentinel config for cross-region replication
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-sentinel.us-east-1:26379"
  - name: failover
    value: "true"
  - name: sentinelMasterName
    value: "mymaster"
```

## Summary

Dapr disaster recovery combines Kubernetes resource backups for component definitions and configurations with state store-level data backups. Regular automated backups combined with documented restore procedures and periodic DR drills reduce recovery time when failures occur.
