# How to Configure PostgreSQL Backup and Restore with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PostgreSQL, Backup, Restore, CloudNativePG, PgBackRest

Description: Configure PostgreSQL backup and restore using operator CRDs and Flux CD for automated, GitOps-managed database disaster recovery.

---

## Introduction

Database backup and restore configuration is one of the most critical aspects of running PostgreSQL in production. Modern PostgreSQL operators like CloudNativePG, PGO, and the Percona operator support physical backups and WAL archiving, providing point-in-time recovery (PITR) capabilities through tools such as Barman Cloud and pgBackRest. Configuring these backups through Flux CD ensures that backup schedules, retention policies, and restore procedures are version-controlled and consistently applied across clusters.

A GitOps approach to backup configuration also makes disaster recovery testing reproducible: you can bootstrap a new cluster from a backup by simply committing a CRD with the restore configuration and letting Flux apply it.

## Prerequisites

- CloudNativePG operator and the Barman Cloud Plugin deployed via Flux
- Object store supported by Barman Cloud (AWS S3, MinIO, Azure Blob Storage, or GCS)
- Object store credentials with read/write access to the backup bucket
- `kubectl` and `flux` CLIs installed

## Step 1: Configure Backup Object Store Credentials

```yaml
# infrastructure/databases/postgres/backup-credentials.yaml (use SealedSecret)

apiVersion: v1
kind: Secret
metadata:
  name: backup-s3-credentials
  namespace: databases
type: Opaque
stringData:
  ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
  ACCESS_SECRET_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 2: Configure Backup in the CloudNativePG Cluster

```yaml
# infrastructure/databases/postgres/production/cluster.yaml
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: app-postgres-backup
  namespace: databases
spec:
  configuration:
    # S3 bucket destination
    destinationPath: "s3://my-company-postgres-backups/production/app-postgres"
    s3Credentials:
      accessKeyId:
        name: backup-s3-credentials
        key: ACCESS_KEY_ID
      secretAccessKey:
        name: backup-s3-credentials
        key: ACCESS_SECRET_KEY
    # Set endpointURL only for S3-compatible providers such as MinIO
    # endpointURL: "https://minio.example.com"
    # WAL archiving compression
    wal:
      compression: gzip
      encryption: AES256  # server-side encryption
      maxParallel: 8      # parallel WAL upload threads
    # Data backup compression
    data:
      compression: gzip
      encryption: AES256
      immediateCheckpoint: false
      jobs: 2   # parallel backup jobs
  # Keep full backups
  retentionPolicy: "30d"  # retain 30 days of backups
---
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-postgres
  namespace: databases
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.3

  # Backup and WAL archiving configuration
  plugins:
    - name: barman-cloud.cloudnative-pg.io
      isWALArchiver: true
      parameters:
        barmanObjectName: app-postgres-backup

  # ... (rest of cluster spec)
  bootstrap:
    initdb:
      database: app
      owner: app
      secret:
        name: app-postgres-credentials

  storage:
    size: 50Gi
```

## Step 3: Create Scheduled Backups

```yaml
# infrastructure/databases/postgres/production/scheduled-backup.yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: app-postgres-daily
  namespace: databases
spec:
  # Schedule: daily at 1 AM
  schedule: "0 0 1 * * *"
  # Backup type: full physical backup
  backupOwnerReference: cluster
  cluster:
    name: app-postgres
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
  immediate: false  # wait for next scheduled time
  suspend: false    # active
---
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: app-postgres-weekly-full
  namespace: databases
spec:
  # Weekly full backup on Sunday at midnight
  schedule: "0 0 0 * * 0"
  backupOwnerReference: cluster
  cluster:
    name: app-postgres
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
  immediate: false
  suspend: false
```

## Step 4: Verify Backup Status

```bash
# List all backups
kubectl get backup -n databases

# Check scheduled backup status
kubectl get scheduledbackup -n databases

# Trigger a manual backup
BACKUP_NAME="app-postgres-manual-$(date +%Y%m%d%H%M)"
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: ${BACKUP_NAME}
  namespace: databases
spec:
  cluster:
    name: app-postgres
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
EOF

# Check backup status and S3 path
kubectl get backup "${BACKUP_NAME}" -n databases -o yaml
```

## Step 5: Restore from Backup (Point-in-Time Recovery)

To restore a cluster from a backup, create a new cluster spec with the `recovery` bootstrap method:

```yaml
# infrastructure/databases/postgres/recovery/cluster-restored.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-postgres-restored
  namespace: databases
spec:
  instances: 1  # start with 1 instance for restore
  imageName: ghcr.io/cloudnative-pg/postgresql:16.3

  bootstrap:
    recovery:
      # Recover from a specific point in time using the source cluster's WAL archive
      source: app-postgres
      recoveryTarget:
        targetTime: "2026-03-13T12:00:00Z"

  # Reference the ObjectStore that contains the original cluster's backups
  externalClusters:
    - name: app-postgres
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: app-postgres-backup
          serverName: app-postgres

  storage:
    size: 50Gi
```

Apply this via Flux by committing it to a `recovery` path in your repository.

## Step 6: Automate Restore Testing

Test restores periodically using a CronJob that creates a temporary recovery cluster and waits for it to become ready:

```yaml
# infrastructure/databases/postgres/backup-validation-job.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backup-validation
  namespace: databases
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backup-validation
  namespace: databases
rules:
  - apiGroups: ["postgresql.cnpg.io"]
    resources: ["clusters"]
    verbs: ["get", "list", "watch", "create", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backup-validation
  namespace: databases
subjects:
  - kind: ServiceAccount
    name: backup-validation
    namespace: databases
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: backup-validation
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-validation
  namespace: databases
spec:
  schedule: "0 6 * * 1"  # Every Monday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: backup-validation
          containers:
            - name: validate
              image: bitnami/kubectl:1.29
              command:
                - /bin/sh
                - -c
                - |
                  set -eu
                  trap 'kubectl delete cluster app-postgres-restore-test -n databases --wait=false --ignore-not-found' EXIT

                  # Create a throwaway recovery cluster from the latest available backup
                  cat <<'EOF' | kubectl apply -f -
                  apiVersion: postgresql.cnpg.io/v1
                  kind: Cluster
                  metadata:
                    name: app-postgres-restore-test
                    namespace: databases
                  spec:
                    instances: 1
                    imageName: ghcr.io/cloudnative-pg/postgresql:16.3
                    bootstrap:
                      recovery:
                        source: app-postgres
                    externalClusters:
                      - name: app-postgres
                        plugin:
                          name: barman-cloud.cloudnative-pg.io
                          parameters:
                            barmanObjectName: app-postgres-backup
                            serverName: app-postgres
                    storage:
                      size: 50Gi
                  EOF
                  kubectl wait cluster/app-postgres-restore-test \
                    -n databases \
                    --for=condition=Ready \
                    --timeout=30m
                  echo "Backup validation completed: $(date)"
```

## Best Practices

- Test your restore procedure in a non-production environment at least monthly to verify backups are valid and the process works.
- Use `retentionPolicy: "30d"` but also verify the actual object store contents - retention is applied during plugin reconciliation.
- Enable WAL compression with `gzip` and encryption with `AES256` for all production backups to save costs and meet security requirements.
- Store backup credentials in SealedSecrets and rotate them quarterly.
- Use Flux `dependsOn` to ensure the ScheduledBackup resource is only created after the Cluster is healthy.
- Set up CloudWatch or Prometheus alerts when backup age exceeds your RPO threshold.

## Conclusion

PostgreSQL backup and restore configuration managed through Flux CD CRDs gives you reproducible, auditable disaster recovery. ScheduledBackups, retention policies, and restore procedures are all described in Git. When disaster strikes, restoring from backup is as simple as committing a recovery cluster spec and letting Flux apply it - no ad-hoc commands, no guessing about configuration parameters. This is the true promise of GitOps for stateful workloads.
