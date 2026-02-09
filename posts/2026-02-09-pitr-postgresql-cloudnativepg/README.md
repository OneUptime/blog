# How to Implement Point-in-Time Recovery for PostgreSQL on Kubernetes with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PostgreSQL, CloudNativePG

Description: Configure point-in-time recovery capabilities for PostgreSQL databases running on Kubernetes using CloudNativePG's backup and WAL archiving features.

---

Point-in-time recovery (PITR) is critical for production PostgreSQL deployments. It lets you restore your database to any moment in time, protecting against data corruption, accidental deletions, and application bugs. CloudNativePG brings enterprise-grade PITR capabilities to PostgreSQL on Kubernetes with automated WAL archiving and backup management. This guide shows you how to configure and use PITR effectively.

## Understanding PITR Architecture

PITR works by combining base backups with continuous archiving of Write-Ahead Log (WAL) files. PostgreSQL writes all changes to WAL before applying them to data files. By keeping a base backup and all subsequent WAL files, you can replay transactions to recreate the database state at any point.

CloudNativePG automates this process. It takes scheduled base backups and continuously archives WAL files to object storage. When you need to recover, you specify a target timestamp, and CloudNativePG restores the base backup and replays WAL files up to that moment.

The architecture uses three components: the primary PostgreSQL instance that generates WAL files, a backup storage location (typically S3 or compatible storage), and the CloudNativePG operator that orchestrates backup and recovery operations.

## Installing CloudNativePG

Start by installing the operator in your cluster:

```bash
# Install CloudNativePG operator
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.21/releases/cnpg-1.21.0.yaml

# Verify installation
kubectl get pods -n cnpg-system
```

The operator installs cluster-wide and watches for Cluster custom resources across all namespaces.

## Configuring S3 Storage for Backups

Create credentials for your backup storage. This example uses AWS S3, but you can use any S3-compatible storage:

```yaml
# backup-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: backup-credentials
  namespace: postgresql
type: Opaque
stringData:
  ACCESS_KEY_ID: "your-access-key"
  ACCESS_SECRET_KEY: "your-secret-key"
```

Apply the secret:

```bash
kubectl create namespace postgresql
kubectl apply -f backup-credentials.yaml
```

## Creating a PostgreSQL Cluster with PITR

Deploy a cluster with backup and WAL archiving enabled:

```yaml
# postgresql-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: postgresql
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised

  # PostgreSQL configuration
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      wal_level: "replica"
      max_wal_senders: "10"
      archive_mode: "on"

  # Storage configuration
  storage:
    size: 20Gi
    storageClass: fast-ssd

  # Backup configuration
  backup:
    barmanObjectStore:
      # S3 configuration
      destinationPath: s3://my-backups/postgres-cluster/
      endpointURL: https://s3.amazonaws.com

      # Credentials
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: ACCESS_SECRET_KEY

      # WAL archiving settings
      wal:
        compression: gzip
        maxParallel: 2

      # Backup retention policy
      retentionPolicy: "30d"

    # Schedule base backups
    schedule:
      - name: daily-backup
        schedule: "0 2 * * *"  # 2 AM daily
        backupOwnerReference: self

      - name: hourly-backup
        schedule: "0 * * * *"  # Every hour
        backupOwnerReference: self

  # Resource limits
  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
    limits:
      memory: "4Gi"
      cpu: "2"

  # Monitoring
  monitoring:
    enablePodMonitor: true
```

This configuration sets up continuous WAL archiving and scheduled backups. The operator automatically handles backup lifecycle and retention.

Deploy the cluster:

```bash
kubectl apply -f postgresql-cluster.yaml

# Watch cluster creation
kubectl get cluster -n postgresql -w

# Check backup status
kubectl get backup -n postgresql
```

## Understanding Backup Types

CloudNativePG creates two types of backups. Scheduled backups run automatically based on your cron expressions. On-demand backups run when you create a Backup resource manually.

Create an on-demand backup:

```yaml
# manual-backup.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: manual-backup
  namespace: postgresql
spec:
  cluster:
    name: postgres-cluster
```

Trigger the backup:

```bash
kubectl apply -f manual-backup.yaml

# Monitor backup progress
kubectl get backup manual-backup -n postgresql -w
```

## Verifying WAL Archiving

Check that WAL files are being archived continuously:

```bash
# View cluster status
kubectl get cluster postgres-cluster -n postgresql -o yaml

# Look for continuous archiving status
kubectl get cluster postgres-cluster -n postgresql \
  -o jsonpath='{.status.currentPrimary}' && echo

# Check WAL archive status
kubectl get cluster postgres-cluster -n postgresql \
  -o jsonpath='{.status.instancesReportedState}' | jq
```

Connect to the primary pod and verify archiving:

```bash
# Get primary pod name
PRIMARY_POD=$(kubectl get pod -n postgresql \
  -l role=primary,cnpg.io/cluster=postgres-cluster \
  -o jsonpath='{.items[0].metadata.name}')

# Check archiving status
kubectl exec -n postgresql $PRIMARY_POD -- \
  psql -U postgres -c "SELECT * FROM pg_stat_archiver;"
```

Successful archiving shows `last_archived_wal` with recent timestamps and `last_failed_wal` as empty.

## Performing Point-in-Time Recovery

To restore to a specific point in time, create a new cluster from your backup. First, determine your target recovery time:

```bash
# List available backups
kubectl get backup -n postgresql

# Get backup details
kubectl describe backup daily-backup-20260209 -n postgresql
```

Create a recovery cluster:

```yaml
# pitr-recovery.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-recovery
  namespace: postgresql
spec:
  instances: 3

  # Bootstrap from backup with PITR
  bootstrap:
    recovery:
      # Source backup
      source: postgres-cluster

      # Recovery target
      recoveryTarget:
        targetTime: "2026-02-09 14:30:00.000000+00"
        # targetName: "before-bad-migration"  # Alternative: named restore point
        # targetXID: "12345"  # Alternative: transaction ID
        # targetLSN: "0/3000000"  # Alternative: log sequence number

      # Backup source
      backup:
        name: daily-backup-20260209

  # Reference to original cluster for WAL access
  externalClusters:
    - name: postgres-cluster
      barmanObjectStore:
        destinationPath: s3://my-backups/postgres-cluster/
        endpointURL: https://s3.amazonaws.com
        s3Credentials:
          accessKeyId:
            name: backup-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: backup-credentials
            key: ACCESS_SECRET_KEY
        wal:
          maxParallel: 8

  storage:
    size: 20Gi
    storageClass: fast-ssd

  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
    limits:
      memory: "4Gi"
      cpu: "2"
```

Start the recovery:

```bash
kubectl apply -f pitr-recovery.yaml

# Monitor recovery progress
kubectl get cluster postgres-recovery -n postgresql -w

# Check logs
kubectl logs -n postgresql -l cnpg.io/cluster=postgres-recovery -f
```

The operator restores the base backup, then replays WAL files until reaching the target time. This process can take minutes to hours depending on the amount of WAL to replay.

## Creating Named Restore Points

For planned operations like schema migrations, create named restore points before making changes:

```bash
# Connect to primary
kubectl exec -n postgresql $PRIMARY_POD -- \
  psql -U postgres -c "SELECT pg_create_restore_point('before-migration-v2');"
```

Later, you can recover to this exact point:

```yaml
bootstrap:
  recovery:
    source: postgres-cluster
    recoveryTarget:
      targetName: "before-migration-v2"
```

## Automating Backup Verification

Verify backups regularly by performing test recoveries. Create a scheduled job:

```yaml
# backup-verification.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: postgresql
spec:
  schedule: "0 6 * * 0"  # Weekly on Sunday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-verifier
          containers:
          - name: verify
            image: ghcr.io/cloudnative-pg/cloudnative-pg:1.21.0
            command:
            - /bin/bash
            - -c
            - |
              # Get latest backup
              LATEST_BACKUP=$(kubectl get backup -n postgresql \
                -l cnpg.io/cluster=postgres-cluster \
                --sort-by=.metadata.creationTimestamp \
                -o jsonpath='{.items[-1].metadata.name}')

              # Create test recovery cluster
              cat <<EOF | kubectl apply -f -
              apiVersion: postgresql.cnpg.io/v1
              kind: Cluster
              metadata:
                name: backup-test-$(date +%s)
                namespace: postgresql
              spec:
                instances: 1
                bootstrap:
                  recovery:
                    source: postgres-cluster
                    backup:
                      name: ${LATEST_BACKUP}
                externalClusters:
                  - name: postgres-cluster
                    barmanObjectStore:
                      destinationPath: s3://my-backups/postgres-cluster/
                      endpointURL: https://s3.amazonaws.com
                storage:
                  size: 10Gi
              EOF

              # Wait and verify, then cleanup
              sleep 300
              kubectl delete cluster -n postgresql -l verification=true
          restartPolicy: OnFailure
```

## Monitoring Backup Health

Check backup metrics and status:

```bash
# List all backups with status
kubectl get backup -n postgresql -o wide

# Check cluster backup status
kubectl get cluster postgres-cluster -n postgresql \
  -o jsonpath='{.status.lastSuccessfulBackup}' && echo

# View backup details
kubectl describe backup daily-backup-20260209 -n postgresql
```

Set up alerts for backup failures using Prometheus rules:

```yaml
# backup-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: postgresql-backup-alerts
  namespace: postgresql
spec:
  groups:
  - name: postgresql.backups
    interval: 60s
    rules:
    - alert: BackupFailed
      expr: |
        cnpg_backup_status{status="failed"} > 0
      for: 5m
      annotations:
        summary: "PostgreSQL backup failed"
        description: "Backup {{ $labels.backup }} failed"

    - alert: NoRecentBackup
      expr: |
        time() - cnpg_backup_last_success_timestamp > 86400
      for: 1h
      annotations:
        summary: "No successful backup in 24 hours"
```

## Recovery Testing Best Practices

Test your recovery process regularly. Create a dedicated namespace for recovery testing:

```bash
# Create test namespace
kubectl create namespace postgresql-recovery-test

# Copy credentials
kubectl get secret backup-credentials -n postgresql -o yaml | \
  sed 's/namespace: postgresql/namespace: postgresql-recovery-test/' | \
  kubectl apply -f -
```

Perform a test recovery quarterly to verify your PITR setup works correctly. Document the recovery time objective (RTO) you achieve during tests.

## Handling Large Databases

For databases with high WAL generation rates, tune archiving parameters:

```yaml
spec:
  postgresql:
    parameters:
      archive_timeout: "300"  # Archive WAL every 5 minutes even if not full
      wal_keep_size: "1GB"    # Keep extra WAL on disk
      max_wal_size: "2GB"     # Larger WAL files before checkpoint

  backup:
    barmanObjectStore:
      wal:
        compression: zstd     # Better compression than gzip
        maxParallel: 4        # More parallel uploads
        archiveTimeout: 300s  # Archive frequency
```

## Conclusion

Point-in-time recovery transforms PostgreSQL disaster recovery from a stressful manual process to an automated, reliable operation. CloudNativePG handles the complexity of WAL archiving, backup management, and recovery orchestration. By configuring proper backup schedules, retention policies, and regularly testing recovery procedures, you can protect your data with minimal recovery time objectives. The combination of base backups and continuous WAL archiving provides the flexibility to recover from any data loss scenario, whether from system failure, human error, or application bugs.
