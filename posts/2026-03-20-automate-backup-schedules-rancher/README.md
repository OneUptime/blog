# How to Automate Backup Schedules in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Backup, Automation, Velero, etcd, Kubernetes, Disaster Recovery

Description: Automate backup schedules in Rancher for etcd, the Rancher management plane, and application workloads using cron-based scheduling, S3 storage, and automated restore testing.

## Introduction

Manual backups are unreliable-they get missed during busy periods, forgotten after personnel changes, and untested until a disaster reveals they don't work. Automating backup schedules in Rancher ensures consistent, tested backups without operational overhead. This guide covers automating all three backup layers: etcd, Rancher management plane, and application data.

## Step 1: Automated etcd Backups via RKE2

RKE2 has built-in etcd snapshot scheduling:

```yaml
# /etc/rancher/rke2/config.yaml on control plane nodes

# Configure etcd snapshots with S3 upload

etcd-snapshot-schedule-cron: "0 */4 * * *"    # Every 4 hours
etcd-snapshot-retention: 15                    # Keep 15 snapshots

# S3 backup destination
etcd-s3: true
etcd-s3-bucket: company-rancher-etcd-backups
etcd-s3-region: us-east-1
etcd-s3-access-key: AKIAIOSFODNN7EXAMPLE
etcd-s3-secret-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
etcd-s3-folder: rke2-production
etcd-s3-retention: 15                         # Keep 15 snapshots in S3
```

```bash
# Restart rke2-server to apply
systemctl restart rke2-server
```

Verify snapshot schedule:
```bash
# List current snapshots
rke2 etcd-snapshot list

# Check S3 for uploaded snapshots
aws s3 ls s3://company-rancher-etcd-backups/rke2-production/
```

## Step 2: Rancher Management Plane Backup Schedule

```yaml
# Automated daily Rancher backup
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-automated-daily
spec:
  storageLocation:
    s3:
      bucketName: company-rancher-management-backups
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
      credentialSecretName: s3-credentials
      credentialSecretNamespace: cattle-resources-system
  resourceSetName: rancher-resource-set-full
  schedule: "0 3 * * *"      # Daily at 3 AM
  retentionCount: 30          # Keep 30 days
  encryptionConfigSecretName: backup-encryption-secret
```

```bash
# Monitor backup status
kubectl get backups.resources.cattle.io
kubectl describe backups.resources.cattle.io rancher-automated-daily

# Create S3 credentials secret
kubectl create secret generic s3-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  -n cattle-resources-system
```

## Step 3: Application Backup with Velero Schedules

```bash
# Create multiple Velero backup schedules for different tiers

# Production: daily backup, 30-day retention
velero schedule create production-daily \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --ttl 720h0m0s \
  --labels tier=production

# Databases: every 6 hours
velero schedule create databases-6h \
  --schedule="0 */6 * * *" \
  --include-namespaces databases \
  --ttl 168h0m0s \
  --labels tier=database

# Pre-maintenance: backup before any major change
velero backup create pre-maintenance-$(date +%Y%m%d-%H%M) \
  --include-namespaces production,databases \
  --wait

# List all schedules
velero schedule get

# Check last backup status per schedule
kubectl get backups.velero.io -n velero \
  --sort-by=.metadata.creationTimestamp \
  -o custom-columns=NAME:.metadata.name,PHASE:.status.phase | \
  grep '^production-daily-' | tail -1
```

## Step 4: Database-Specific Backup CronJobs

```yaml
# PostgreSQL backup CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: databases
spec:
  schedule: "0 1 * * *"    # Daily at 1 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-sa
          containers:
            - name: pg-backup
              image: postgres:15-alpine
              command:
                - /bin/sh
                - -c
                - |
                  apk add --no-cache aws-cli >/dev/null
                  DATE=$(date +%Y%m%d-%H%M%S)
                  pg_dump -h $PGHOST -U $PGUSER $PGDATABASE | \
                  gzip | \
                  aws s3 cp - \
                    s3://company-db-backups/postgres/$PGDATABASE-$DATE.sql.gz \
                    --sse aws:kms
                  echo "Backup completed: $PGDATABASE-$DATE.sql.gz"
              env:
                - name: PGHOST
                  value: postgres.databases.svc
                - name: PGUSER
                  value: backup_user
                - name: PGDATABASE
                  value: app_production
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: postgres-backup-secret
                      key: password
                - name: AWS_DEFAULT_REGION
                  value: us-east-1
          restartPolicy: OnFailure
```

## Step 5: Backup Monitoring and Alerting

```yaml
# Alert when backup fails
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backup-alerts
  namespace: monitoring
spec:
  groups:
    - name: backups
      rules:
        - alert: VeleroBackupFailed
          expr: |
            velero_backup_last_status{schedule!=""} != 1
          for: 15m
          annotations:
            summary: "Velero backup {{ $labels.schedule }} is failing"
          labels:
            severity: critical

        - alert: VeleroNoNewBackup
          expr: |
            (
              (time() - velero_backup_last_successful_timestamp{schedule!=""}) > bool (25 * 3600)
              or
              absent(velero_backup_last_successful_timestamp{schedule!=""})
            ) == 1
          for: 1h
          annotations:
            summary: "Velero backup {{ $labels.schedule }} has not run successfully in the last 25 hours"
          labels:
            severity: critical
```

## Step 6: Automated Restore Testing

```yaml
# Weekly restore test CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: restore-test
  namespace: cattle-resources-system
spec:
  schedule: "0 4 * * 0"    # Every Sunday at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: restore-tester
              image: myregistry/backup-tester:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Get latest backup
                  LATEST=$(velero backup get -o json | \
                    jq -r '.items
                      | map(select((.metadata.name | startswith("production-daily-")) and .status.phase == "Completed"))
                      | sort_by(.status.completionTimestamp)
                      | last
                      | .metadata.name')

                  if [ -z "$LATEST" ] || [ "$LATEST" = "null" ]; then
                    echo "No completed production-daily backup found"
                    exit 1
                  fi

                  # Restore to test namespace
                  velero restore create restore-test-$(date +%Y%m%d) \
                    --from-backup $LATEST \
                    --namespace-mappings production:restore-test \
                    --wait

                  # Validate restored resources
                  kubectl get all -n restore-test

                  # Clean up test namespace
                  kubectl delete namespace restore-test
          restartPolicy: OnFailure
```

## Conclusion

Automated backup schedules in Rancher eliminate the operational risk of missed backups. RKE2 handles etcd snapshots with S3 upload, the Rancher Backup Operator handles management plane state, and Velero handles application workloads. The most valuable automation is automated restore testing-running a weekly restore to a test namespace validates that backups are actually restorable. Alert on backup failures so that the team responds before an actual disaster forces a recovery from a broken backup.
