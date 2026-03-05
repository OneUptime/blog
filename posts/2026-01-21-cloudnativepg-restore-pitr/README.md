# How to Restore PostgreSQL from Backup with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Backup, Recovery, PITR, Disaster Recovery

Description: A comprehensive guide to restoring PostgreSQL clusters with CloudNativePG, covering full recovery, point-in-time recovery (PITR), and disaster recovery procedures.

---

Being able to restore from backup is as important as having backups. CloudNativePG supports full recovery and point-in-time recovery (PITR) from object storage backups. This guide covers all restoration scenarios you might encounter.

## Prerequisites

- CloudNativePG operator installed
- Existing backups in object storage (S3, GCS, or Azure)
- Access credentials for backup storage
- Understanding of your backup retention policy

## Recovery Concepts

### Recovery Types

1. **Full Recovery**: Restore to the latest available state
2. **Point-in-Time Recovery (PITR)**: Restore to a specific moment
3. **Clone**: Create a new cluster from backup while source continues

### Recovery Targets

- **Target Time**: Recover to specific timestamp
- **Target LSN**: Recover to specific Log Sequence Number
- **Target XID**: Recover to specific transaction ID
- **Target Name**: Recover to named restore point
- **Immediate**: Stop as soon as consistent state is reached

## Full Recovery

### Restore to Latest State

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-restored
  namespace: default
spec:
  instances: 3

  storage:
    size: 100Gi
    storageClass: fast-ssd

  bootstrap:
    recovery:
      source: postgres-backup

  externalClusters:
    - name: postgres-backup
      barmanObjectStore:
        destinationPath: s3://my-bucket/postgres/
        s3Credentials:
          accessKeyId:
            name: s3-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: s3-credentials
            key: SECRET_ACCESS_KEY
```

### Restore from Specific Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-restored
spec:
  instances: 3
  storage:
    size: 100Gi

  bootstrap:
    recovery:
      # Reference specific backup object
      backup:
        name: postgres-backup-20260120

  # No externalClusters needed when using backup object
```

## Point-in-Time Recovery (PITR)

### Recover to Specific Timestamp

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-pitr
spec:
  instances: 3
  storage:
    size: 100Gi

  bootstrap:
    recovery:
      source: postgres-backup

      # Recovery target
      recoveryTarget:
        targetTime: "2026-01-20T15:30:00Z"

  externalClusters:
    - name: postgres-backup
      barmanObjectStore:
        destinationPath: s3://my-bucket/postgres/
        s3Credentials:
          accessKeyId:
            name: s3-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: s3-credentials
            key: SECRET_ACCESS_KEY
```

### Recover to Specific LSN

```yaml
spec:
  bootstrap:
    recovery:
      source: postgres-backup
      recoveryTarget:
        targetLSN: "0/1234567"
```

### Recover to Transaction ID

```yaml
spec:
  bootstrap:
    recovery:
      source: postgres-backup
      recoveryTarget:
        targetXID: "12345678"
```

### Recover to Named Restore Point

First, create restore points in PostgreSQL:

```sql
SELECT pg_create_restore_point('before_migration');
-- Run migration
SELECT pg_create_restore_point('after_migration');
```

Then recover:

```yaml
spec:
  bootstrap:
    recovery:
      source: postgres-backup
      recoveryTarget:
        targetName: "before_migration"
```

### Recover and Stop Immediately

Recover to earliest consistent state:

```yaml
spec:
  bootstrap:
    recovery:
      source: postgres-backup
      recoveryTarget:
        targetImmediate: true
```

## Recovery Target Options

### All Recovery Target Parameters

```yaml
spec:
  bootstrap:
    recovery:
      source: postgres-backup

      recoveryTarget:
        # Stop at specific time
        targetTime: "2026-01-20T15:30:00Z"

        # Stop at specific LSN
        # targetLSN: "0/1234567"

        # Stop at specific transaction
        # targetXID: "12345678"

        # Stop at named restore point
        # targetName: "before_migration"

        # Stop as soon as consistent
        # targetImmediate: true

        # Include or exclude target in recovery
        exclusive: false  # Include the target (default)
        # exclusive: true  # Stop just before target

        # What to do after reaching target
        targetTLI: "latest"  # Timeline to recover to

        # Backup to use as starting point
        # backupID: "20260120T120000"
```

## Recovery from Different Storage Providers

### S3 Recovery

```yaml
spec:
  bootstrap:
    recovery:
      source: s3-backup
      recoveryTarget:
        targetTime: "2026-01-20T15:30:00Z"

  externalClusters:
    - name: s3-backup
      barmanObjectStore:
        destinationPath: s3://bucket-name/postgres/
        endpointURL: https://s3.us-east-1.amazonaws.com
        s3Credentials:
          accessKeyId:
            name: s3-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: s3-credentials
            key: SECRET_ACCESS_KEY
          region:
            name: s3-credentials
            key: AWS_REGION
        wal:
          maxParallel: 8
```

### GCS Recovery

```yaml
spec:
  bootstrap:
    recovery:
      source: gcs-backup
      recoveryTarget:
        targetTime: "2026-01-20T15:30:00Z"

  externalClusters:
    - name: gcs-backup
      barmanObjectStore:
        destinationPath: gs://bucket-name/postgres/
        googleCredentials:
          applicationCredentials:
            name: gcs-credentials
            key: gcsCredentials
        wal:
          maxParallel: 8
```

### Azure Recovery

```yaml
spec:
  bootstrap:
    recovery:
      source: azure-backup
      recoveryTarget:
        targetTime: "2026-01-20T15:30:00Z"

  externalClusters:
    - name: azure-backup
      barmanObjectStore:
        destinationPath: https://storageaccount.blob.core.windows.net/container/postgres/
        azureCredentials:
          storageAccount:
            name: azure-credentials
            key: STORAGE_ACCOUNT
          storageKey:
            name: azure-credentials
            key: STORAGE_KEY
        wal:
          maxParallel: 8
```

## Clone Running Cluster

Create a copy without affecting the source:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-clone
spec:
  instances: 3
  storage:
    size: 100Gi

  bootstrap:
    pg_basebackup:
      source: source-cluster

  externalClusters:
    - name: source-cluster
      connectionParameters:
        host: postgres-source-rw.production.svc
        user: streaming_replica
        dbname: postgres
      password:
        name: source-cluster-replication
        key: password
```

## Disaster Recovery Procedures

### Complete Disaster Recovery

When original cluster is completely lost:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-dr
  namespace: production
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  storage:
    size: 100Gi
    storageClass: fast-ssd

  walStorage:
    size: 20Gi
    storageClass: fast-ssd

  # Match original configuration
  postgresql:
    parameters:
      shared_buffers: "2GB"
      effective_cache_size: "6GB"
      max_connections: "200"

  bootstrap:
    recovery:
      source: production-backup

  externalClusters:
    - name: production-backup
      barmanObjectStore:
        destinationPath: s3://company-backups/postgres/production/
        s3Credentials:
          accessKeyId:
            name: backup-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: backup-credentials
            key: SECRET_ACCESS_KEY

  # Set up new backups immediately
  backup:
    barmanObjectStore:
      destinationPath: s3://company-backups/postgres/production-dr/
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        maxParallel: 4
    retentionPolicy: "30d"
```

### Cross-Region Recovery

Restore in a different region for DR:

```yaml
spec:
  bootstrap:
    recovery:
      source: us-east-backup

  externalClusters:
    - name: us-east-backup
      barmanObjectStore:
        # Original region backup
        destinationPath: s3://us-east-backups/postgres/
        endpointURL: https://s3.us-east-1.amazonaws.com
        s3Credentials:
          # Cross-region accessible credentials
          accessKeyId:
            name: cross-region-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: cross-region-credentials
            key: SECRET_ACCESS_KEY
```

## Recovery Verification

### Monitor Recovery Progress

```bash
# Watch cluster status
kubectl get cluster postgres-restored -w

# Check pods
kubectl get pods -l cnpg.io/cluster=postgres-restored

# View recovery logs
kubectl logs -l cnpg.io/cluster=postgres-restored -c postgres -f

# Check events
kubectl get events --field-selector involvedObject.name=postgres-restored --sort-by='.lastTimestamp'
```

### Verify Data Integrity

```bash
# Connect to restored cluster
kubectl exec -it postgres-restored-1 -- psql -U postgres

# Check database list
\l

# Verify table counts
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

# Check for data consistency
SELECT COUNT(*) FROM important_table;

# Verify timestamp of data
SELECT MAX(created_at) FROM events;
```

### Post-Recovery Checklist

```bash
# 1. Verify cluster is healthy
kubectl get cluster postgres-restored

# 2. Check all instances are running
kubectl get pods -l cnpg.io/cluster=postgres-restored

# 3. Verify replication is working
kubectl exec postgres-restored-1 -- psql -c "SELECT * FROM pg_stat_replication;"

# 4. Test connections
kubectl port-forward svc/postgres-restored-rw 5432:5432
psql -h localhost -U postgres -d myapp

# 5. Verify data integrity
# Run application-specific checks

# 6. Update DNS/connection strings if needed

# 7. Enable new backups
kubectl apply -f scheduled-backup.yaml
```

## Recovery Scenarios

### Accidental Data Deletion

```yaml
# Find the time just before deletion
# Check application logs or audit logs for the time

spec:
  bootstrap:
    recovery:
      source: production-backup
      recoveryTarget:
        # Restore to 1 minute before deletion
        targetTime: "2026-01-20T14:29:00Z"
```

### Corrupted Data

```yaml
# Restore to before corruption occurred
spec:
  bootstrap:
    recovery:
      source: production-backup
      recoveryTarget:
        # Use exclusive to stop just before the bad transaction
        targetXID: "12345678"
        exclusive: true
```

### Failed Migration Rollback

```yaml
# Restore to restore point created before migration
spec:
  bootstrap:
    recovery:
      source: production-backup
      recoveryTarget:
        targetName: "before_migration_v2"
```

### Cluster Corruption

```yaml
# Full restore to latest available state
spec:
  bootstrap:
    recovery:
      source: production-backup
      # No recoveryTarget = restore to latest
```

## Testing Recovery Procedures

### Regular Recovery Tests

Create a test recovery cluster monthly:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: recovery-test
  namespace: test
  labels:
    test-type: recovery
spec:
  instances: 1
  storage:
    size: 50Gi

  bootstrap:
    recovery:
      source: production-backup
      recoveryTarget:
        targetTime: "2026-01-20T00:00:00Z"

  externalClusters:
    - name: production-backup
      barmanObjectStore:
        destinationPath: s3://company-backups/postgres/production/
        s3Credentials:
          accessKeyId:
            name: backup-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: backup-credentials
            key: SECRET_ACCESS_KEY
```

### Automated Recovery Test Script

```bash
#!/bin/bash
set -e

NAMESPACE="test"
CLUSTER_NAME="recovery-test-$(date +%Y%m%d)"

# Create recovery test cluster
cat <<EOF | kubectl apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: ${CLUSTER_NAME}
  namespace: ${NAMESPACE}
spec:
  instances: 1
  storage:
    size: 50Gi
  bootstrap:
    recovery:
      source: production-backup
  externalClusters:
    - name: production-backup
      barmanObjectStore:
        destinationPath: s3://company-backups/postgres/production/
        s3Credentials:
          accessKeyId:
            name: backup-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: backup-credentials
            key: SECRET_ACCESS_KEY
EOF

# Wait for cluster to be ready
echo "Waiting for recovery cluster..."
kubectl wait --for=condition=Ready cluster/${CLUSTER_NAME} -n ${NAMESPACE} --timeout=30m

# Run validation queries
echo "Running validation..."
kubectl exec -n ${NAMESPACE} ${CLUSTER_NAME}-1 -- psql -c "SELECT COUNT(*) FROM users;"

# Clean up
echo "Cleaning up test cluster..."
kubectl delete cluster ${CLUSTER_NAME} -n ${NAMESPACE}

echo "Recovery test completed successfully!"
```

## Troubleshooting Recovery

### Recovery Stuck

```bash
# Check pod logs
kubectl logs postgres-restored-1 -c postgres

# Check events
kubectl get events --sort-by='.lastTimestamp' | grep postgres-restored

# Common issues:
# - Invalid credentials
# - Backup not found
# - Network issues reaching storage
```

### WAL Files Missing

```bash
# Check if WAL files exist in storage
aws s3 ls s3://bucket/postgres/wals/

# If gaps exist, may need to use earlier backup
# or accept data loss up to last complete backup
```

### Invalid Recovery Target

```bash
# Error: recovery target not found
# The target time/LSN may be beyond available WAL

# Check latest available WAL
kubectl exec postgres-restored-1 -- barman-cloud-wal-archive --list s3://bucket/postgres/

# Use an earlier target or remove target for full recovery
```

### Permission Errors

```bash
# Verify credentials secret
kubectl get secret backup-credentials -o yaml

# Test credentials
aws s3 ls s3://bucket/postgres/

# Check IAM permissions for IRSA
```

## Conclusion

Recovery capabilities are essential for production PostgreSQL:

1. **Test regularly** - Don't wait for a disaster to find out backups don't work
2. **Document procedures** - Have runbooks ready for different scenarios
3. **Know your targets** - Understand what recovery points are available
4. **Monitor backup health** - Alert on backup failures immediately
5. **Practice PITR** - It's more complex than full recovery

CloudNativePG's recovery features provide powerful tools for disaster recovery, but they require proper configuration and regular testing to ensure you can recover when needed.
