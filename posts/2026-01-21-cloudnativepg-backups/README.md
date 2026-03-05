# How to Set Up PostgreSQL Backups with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Backup, S3, WAL Archiving, Disaster Recovery

Description: A comprehensive guide to setting up PostgreSQL backups with CloudNativePG, covering continuous WAL archiving, scheduled backups, and storage configurations for S3, GCS, and Azure Blob Storage.

---

Backups are critical for any production database. CloudNativePG provides built-in backup capabilities with continuous WAL archiving and base backups to object storage. This guide covers setting up comprehensive backup strategies for your PostgreSQL clusters.

## Prerequisites

- CloudNativePG operator installed
- PostgreSQL cluster running
- Object storage bucket (S3, GCS, or Azure Blob)
- Storage credentials

## Backup Architecture

CloudNativePG supports two backup types:

1. **Continuous WAL Archiving**: Streams WAL files to object storage in real-time
2. **Base Backups**: Full physical backups of the database

Together, they enable Point-in-Time Recovery (PITR) to any moment between backups.

```mermaid
flowchart LR
    PG["PostgreSQL<br/>Cluster"]
    WAL["WAL Archiver<br/>(Barman)"]
    Storage["Object Storage<br/>(S3/GCS/Azure)"]

    PG -->|"Continuous WAL Streaming"| WAL --> Storage
    PG -->|"Scheduled Base Backup"| Storage
```

## Basic Backup Configuration

### Minimal S3 Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-backup
spec:
  instances: 3
  storage:
    size: 10Gi

  backup:
    barmanObjectStore:
      destinationPath: s3://my-bucket/postgres/
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-credentials
          key: SECRET_ACCESS_KEY
    retentionPolicy: "30d"
```

Create credentials secret:

```bash
kubectl create secret generic s3-credentials \
  --from-literal=ACCESS_KEY_ID=your-access-key \
  --from-literal=SECRET_ACCESS_KEY=your-secret-key
```

## Storage Provider Configurations

### Amazon S3

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/path/
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
        # Optional: session token for temporary credentials
        sessionToken:
          name: s3-credentials
          key: AWS_SESSION_TOKEN
```

S3 credentials secret:

```bash
kubectl create secret generic s3-credentials \
  --from-literal=ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
  --from-literal=SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --from-literal=AWS_REGION=us-east-1
```

### S3 with IAM Role (IRSA)

For EKS with IAM Roles for Service Accounts:

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/

      s3Credentials:
        inheritFromIAMRole: true
```

Configure service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: postgres-backup
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/postgres-backup-role
```

### Google Cloud Storage

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: gs://bucket-name/postgres/

      googleCredentials:
        applicationCredentials:
          name: gcs-credentials
          key: gcsCredentials
        # Or use workload identity
        # gkeEnvironment: true
```

Create GCS credentials:

```bash
# Create service account key in GCP
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=postgres-backup@project-id.iam.gserviceaccount.com

# Create secret
kubectl create secret generic gcs-credentials \
  --from-file=gcsCredentials=gcs-key.json
```

### GCS with Workload Identity

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: gs://bucket-name/postgres/

      googleCredentials:
        gkeEnvironment: true
```

Annotate service account:

```bash
kubectl annotate serviceaccount postgres-backup \
  iam.gke.io/gcp-service-account=postgres-backup@project-id.iam.gserviceaccount.com
```

### Azure Blob Storage

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: https://storageaccount.blob.core.windows.net/container/postgres/

      azureCredentials:
        storageAccount:
          name: azure-credentials
          key: STORAGE_ACCOUNT
        storageKey:
          name: azure-credentials
          key: STORAGE_KEY
        # Or use SAS token
        # storageSasToken:
        #   name: azure-credentials
        #   key: SAS_TOKEN
```

Create Azure credentials:

```bash
kubectl create secret generic azure-credentials \
  --from-literal=STORAGE_ACCOUNT=mystorageaccount \
  --from-literal=STORAGE_KEY=your-storage-key
```

### Azure with Managed Identity

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: https://storageaccount.blob.core.windows.net/container/postgres/

      azureCredentials:
        inheritFromAzureAD: true
```

### MinIO / S3-Compatible Storage

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/
      endpointURL: https://minio.example.com:9000

      s3Credentials:
        accessKeyId:
          name: minio-credentials
          key: ACCESS_KEY
        secretAccessKey:
          name: minio-credentials
          key: SECRET_KEY
```

## WAL Archiving Configuration

### Basic WAL Archiving

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/

      wal:
        compression: gzip  # gzip, bzip2, snappy, lz4, zstd
        maxParallel: 4     # Parallel upload threads
```

### Advanced WAL Configuration

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/

      wal:
        # Compression (reduces storage and transfer)
        compression: zstd

        # Parallel uploads
        maxParallel: 8

        # Encryption (AES-256)
        encryption: AES256

        # Archive timeout
        archiveTimeout: "5m"
```

## Base Backup Configuration

### Configure Data Backups

```yaml
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/

      data:
        # Compression
        compression: gzip

        # Parallel backup jobs
        jobs: 2

        # Encryption
        encryption: AES256

        # Immediate checkpoint (vs spread)
        immediateCheckpoint: false
```

### Volume Snapshot Backups

For Kubernetes volume snapshot support:

```yaml
spec:
  backup:
    volumeSnapshot:
      className: csi-snapshotter
      snapshotOwnerReference: cluster
      labels:
        backup-type: snapshot
      annotations:
        description: "PostgreSQL backup snapshot"
```

## Scheduled Backups

### Create Backup Schedule

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-daily-backup
spec:
  # Cron schedule (daily at midnight)
  schedule: "0 0 * * *"

  # Target cluster
  cluster:
    name: postgres-cluster

  # Backup ownership (for garbage collection)
  backupOwnerReference: cluster

  # Suspend schedule
  suspend: false

  # Run immediately on creation
  immediate: false

  # Override backup method
  # method: barmanObjectStore  # or volumeSnapshot
```

### Multiple Backup Schedules

```yaml
# Hourly WAL-based backups
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-hourly
spec:
  schedule: "0 * * * *"
  cluster:
    name: postgres-cluster
  backupOwnerReference: self
---
# Daily full backups
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-daily
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  cluster:
    name: postgres-cluster
  backupOwnerReference: cluster
---
# Weekly backups with longer retention
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-weekly
spec:
  schedule: "0 3 * * 0"  # 3 AM Sunday
  cluster:
    name: postgres-cluster
  backupOwnerReference: none  # Keep indefinitely
```

## On-Demand Backups

### Create Immediate Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: postgres-backup-manual-20260121
spec:
  cluster:
    name: postgres-cluster

  # Optional: override backup method
  # method: barmanObjectStore
```

Apply and monitor:

```bash
kubectl apply -f backup.yaml

# Watch backup progress
kubectl get backup postgres-backup-manual-20260121 -w

# Check backup status
kubectl describe backup postgres-backup-manual-20260121
```

### Pre-Migration Backup

```bash
# Create backup before major changes
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: pre-migration-$(date +%Y%m%d%H%M%S)
spec:
  cluster:
    name: postgres-cluster
EOF
```

## Retention Policies

### Configure Retention

```yaml
spec:
  backup:
    retentionPolicy: "30d"  # Keep backups for 30 days

    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/
      # WAL and data retention follow cluster retention policy
```

### Retention Policy Options

```yaml
# Days
retentionPolicy: "30d"

# Weeks
retentionPolicy: "4w"

# Months
retentionPolicy: "3m"

# Keep specific number of backups
# (Not directly supported - use external lifecycle policies)
```

### S3 Lifecycle Policy

For additional control, configure S3 lifecycle:

```json
{
  "Rules": [
    {
      "ID": "DeleteOldBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "postgres/wals/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "TransitionToGlacier",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "postgres/base/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

## Monitoring Backups

### Check Backup Status

```bash
# List all backups
kubectl get backup -l cnpg.io/cluster=postgres-cluster

# Detailed backup info
kubectl describe backup postgres-backup-manual

# Check scheduled backups
kubectl get scheduledbackup

# Backup logs
kubectl logs -l cnpg.io/cluster=postgres-cluster -c postgres | grep -i backup
```

### Backup Metrics (Prometheus)

```yaml
# Last backup age (seconds)
cnpg_pg_stat_archiver_last_archived_age

# Archive failures
cnpg_pg_stat_archiver_failed_count

# Backup status
cnpg_backup_status{status="completed"}
```

### Alert Rules

```yaml
groups:
  - name: cloudnativepg-backup
    rules:
      - alert: PostgreSQLBackupFailed
        expr: cnpg_backup_status{status="failed"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL backup failed"
          description: "Backup {{ $labels.backup }} failed for cluster {{ $labels.cluster }}"

      - alert: PostgreSQLNoRecentBackup
        expr: time() - cnpg_pg_stat_archiver_last_archived_time > 3600
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "No recent PostgreSQL backup"
          description: "No WAL archived in the last hour for {{ $labels.cluster }}"

      - alert: PostgreSQLArchiveFailure
        expr: increase(cnpg_pg_stat_archiver_failed_count[1h]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL WAL archive failures"
          description: "Archive failures detected for {{ $labels.cluster }}"
```

## Complete Production Example

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: production-postgres
  namespace: production
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  storage:
    size: 200Gi
    storageClass: fast-ssd

  walStorage:
    size: 50Gi
    storageClass: fast-ssd

  postgresql:
    parameters:
      # WAL settings for backup
      archive_mode: "on"
      archive_timeout: "5min"
      max_wal_size: "4GB"
      wal_level: "replica"

  backup:
    # Retention period
    retentionPolicy: "30d"

    barmanObjectStore:
      destinationPath: s3://company-backups/postgres/production/
      endpointURL: https://s3.us-east-1.amazonaws.com

      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY
        region:
          name: backup-credentials
          key: AWS_REGION

      # WAL archiving
      wal:
        compression: zstd
        maxParallel: 8
        encryption: AES256

      # Base backup settings
      data:
        compression: zstd
        jobs: 4
        encryption: AES256
        immediateCheckpoint: false

  # Server-side encryption
  backup:
    barmanObjectStore:
      serverName: production-postgres
      # ... credentials as above

      # S3 server-side encryption
      # Handled via S3 bucket policy

---
# Daily backup schedule
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: production-daily-backup
  namespace: production
spec:
  schedule: "0 2 * * *"
  backupOwnerReference: cluster
  cluster:
    name: production-postgres

---
# Hourly backup for critical data
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: production-hourly-backup
  namespace: production
spec:
  schedule: "0 * * * *"
  backupOwnerReference: self
  cluster:
    name: production-postgres
```

## Verify Backups

### List Available Backups

```bash
# Using kubectl
kubectl get backup -n production

# Check backup details
kubectl describe backup production-daily-backup-20260121 -n production
```

### Verify Backup Contents

```bash
# List files in S3 bucket
aws s3 ls s3://company-backups/postgres/production/ --recursive

# Check WAL files
aws s3 ls s3://company-backups/postgres/production/wals/

# Check base backups
aws s3 ls s3://company-backups/postgres/production/base/
```

### Test Backup Restoration

Regularly test backups by restoring to a test cluster:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: backup-test
  namespace: test
spec:
  instances: 1
  storage:
    size: 200Gi

  bootstrap:
    recovery:
      source: production-postgres

  externalClusters:
    - name: production-postgres
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

## Conclusion

Proper backup configuration is essential for disaster recovery:

1. **Enable WAL archiving** for continuous protection
2. **Schedule regular base backups** for faster recovery
3. **Configure appropriate retention** based on compliance needs
4. **Monitor backup status** with alerts
5. **Regularly test restoration** to verify backups work

CloudNativePG's integrated backup support with Barman makes it straightforward to implement a comprehensive backup strategy for your PostgreSQL clusters on Kubernetes.
