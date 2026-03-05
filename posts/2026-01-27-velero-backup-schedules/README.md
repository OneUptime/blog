# How to Configure Velero Backup Schedules for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, Disaster Recovery, K8s

Description: Learn how to configure Velero backup schedules for Kubernetes cluster protection, including namespace selection, retention policies, and storage backends.

---

> Backups are worthless if they never run or silently fail. Velero automates Kubernetes backup scheduling so you can sleep without worrying about data loss.

## What is Velero?

Velero is an open-source tool for backing up and restoring Kubernetes cluster resources and persistent volumes. It supports scheduled backups, disaster recovery, and cluster migration across cloud providers.

## Installing Velero

### Prerequisites

```bash
# Download Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/v1.13.0/velero-v1.13.0-linux-amd64.tar.gz
tar -xvf velero-v1.13.0-linux-amd64.tar.gz
sudo mv velero-v1.13.0-linux-amd64/velero /usr/local/bin/

# Verify installation
velero version
```

### AWS S3 Backend Setup

```bash
# Create S3 bucket for backups
aws s3api create-bucket \
    --bucket my-velero-backups \
    --region us-east-1

# Create IAM policy for Velero
cat > velero-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags",
                "ec2:CreateVolume",
                "ec2:CreateSnapshot",
                "ec2:DeleteSnapshot"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::my-velero-backups/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::my-velero-backups"
        }
    ]
}
EOF

# Create credentials file
cat > credentials-velero <<EOF
[default]
aws_access_key_id=<YOUR_ACCESS_KEY>
aws_secret_access_key=<YOUR_SECRET_KEY>
EOF

# Install Velero with AWS plugin
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.9.0 \
    --bucket my-velero-backups \
    --backup-location-config region=us-east-1 \
    --snapshot-location-config region=us-east-1 \
    --secret-file ./credentials-velero
```

### Google Cloud Storage Backend

```bash
# Create GCS bucket
gsutil mb gs://my-velero-backups

# Create service account and download key
gcloud iam service-accounts create velero \
    --display-name "Velero Backup"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:velero@$PROJECT_ID.iam.gserviceaccount.com \
    --role roles/compute.storageAdmin

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:velero@$PROJECT_ID.iam.gserviceaccount.com \
    --role roles/storage.admin

gcloud iam service-accounts keys create credentials-velero \
    --iam-account velero@$PROJECT_ID.iam.gserviceaccount.com

# Install Velero with GCP plugin
velero install \
    --provider gcp \
    --plugins velero/velero-plugin-for-gcp:v1.9.0 \
    --bucket my-velero-backups \
    --secret-file ./credentials-velero
```

### Azure Blob Storage Backend

```bash
# Create resource group and storage account
az group create --name velero-backups --location eastus
az storage account create \
    --name velerobackups \
    --resource-group velero-backups \
    --sku Standard_GRS

# Create blob container
az storage container create \
    --name velero \
    --account-name velerobackups

# Get storage account key
AZURE_STORAGE_ACCOUNT_ACCESS_KEY=$(az storage account keys list \
    --account-name velerobackups \
    --resource-group velero-backups \
    --query "[0].value" -o tsv)

# Create credentials file
cat > credentials-velero <<EOF
AZURE_STORAGE_ACCOUNT_ACCESS_KEY=${AZURE_STORAGE_ACCOUNT_ACCESS_KEY}
AZURE_CLOUD_NAME=AzurePublicCloud
EOF

# Install Velero with Azure plugin
velero install \
    --provider azure \
    --plugins velero/velero-plugin-for-microsoft-azure:v1.9.0 \
    --bucket velero \
    --backup-location-config resourceGroup=velero-backups,storageAccount=velerobackups \
    --secret-file ./credentials-velero
```

## Creating Backup Schedules

### Basic Schedule

```bash
# Create a daily backup at 2 AM UTC
velero schedule create daily-backup \
    --schedule="0 2 * * *"

# Create a weekly backup on Sundays at 3 AM
velero schedule create weekly-backup \
    --schedule="0 3 * * 0"

# Create an hourly backup
velero schedule create hourly-backup \
    --schedule="0 * * * *"
```

### Schedule with TTL (Retention)

```bash
# Daily backups retained for 7 days
velero schedule create daily-backup \
    --schedule="0 2 * * *" \
    --ttl 168h

# Weekly backups retained for 30 days
velero schedule create weekly-backup \
    --schedule="0 3 * * 0" \
    --ttl 720h

# Monthly backups retained for 1 year
velero schedule create monthly-backup \
    --schedule="0 4 1 * *" \
    --ttl 8760h
```

### Schedule YAML Definition

```yaml
# daily-backup-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-production-backup
  namespace: velero
spec:
  # Cron expression: minute hour day-of-month month day-of-week
  schedule: "0 2 * * *"
  # Backup retention period
  ttl: 168h0m0s
  template:
    # Include specific namespaces
    includedNamespaces:
      - production
      - staging
    # Exclude system namespaces
    excludedNamespaces:
      - kube-system
      - velero
    # Include persistent volumes
    snapshotVolumes: true
    # Storage location for this backup
    storageLocation: default
    # Volume snapshot location
    volumeSnapshotLocations:
      - default
```

Apply the schedule:

```bash
kubectl apply -f daily-backup-schedule.yaml
```

## Namespace and Label Selectors

### Backup Specific Namespaces

```bash
# Backup only production namespace
velero schedule create prod-backup \
    --schedule="0 * * * *" \
    --include-namespaces production

# Backup multiple namespaces
velero schedule create multi-ns-backup \
    --schedule="0 2 * * *" \
    --include-namespaces production,staging,development
```

### Exclude Namespaces

```bash
# Backup all except system namespaces
velero schedule create all-apps-backup \
    --schedule="0 2 * * *" \
    --exclude-namespaces kube-system,kube-public,velero
```

### Label-Based Selection

```bash
# Backup resources with specific label
velero schedule create labeled-backup \
    --schedule="0 2 * * *" \
    --selector app=critical

# Backup multiple labels (AND condition)
velero schedule create multi-label-backup \
    --schedule="0 2 * * *" \
    --selector "app=api,tier=backend"
```

### YAML with Label Selectors

```yaml
# label-selector-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: critical-apps-backup
  namespace: velero
spec:
  schedule: "0 */4 * * *"
  ttl: 72h0m0s
  template:
    # Select resources by label
    labelSelector:
      matchLabels:
        backup: "true"
        tier: "production"
    # Or use matchExpressions for complex selection
    # labelSelector:
    #   matchExpressions:
    #     - key: environment
    #       operator: In
    #       values: ["prod", "staging"]
    snapshotVolumes: true
```

## Including and Excluding Resources

### Include Specific Resource Types

```bash
# Backup only deployments and services
velero schedule create minimal-backup \
    --schedule="0 2 * * *" \
    --include-resources deployments,services,configmaps,secrets

# Backup only custom resources
velero schedule create crd-backup \
    --schedule="0 3 * * *" \
    --include-resources customresourcedefinitions
```

### Exclude Resource Types

```bash
# Exclude events and pods (recreated by deployments)
velero schedule create no-events-backup \
    --schedule="0 2 * * *" \
    --exclude-resources events,pods
```

### Cluster-Scoped Resources

```bash
# Include cluster-scoped resources
velero schedule create full-backup \
    --schedule="0 2 * * *" \
    --include-cluster-resources=true

# Exclude cluster-scoped resources
velero schedule create namespaced-only \
    --schedule="0 2 * * *" \
    --include-cluster-resources=false
```

### Complete Resource Configuration

```yaml
# resource-filter-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: filtered-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  ttl: 168h0m0s
  template:
    includedNamespaces:
      - production
    # Specific resources to include
    includedResources:
      - deployments
      - services
      - configmaps
      - secrets
      - persistentvolumeclaims
      - ingresses
    # Resources to exclude
    excludedResources:
      - events
      - pods
    # Include cluster-scoped resources
    includeClusterResources: true
    snapshotVolumes: true
```

## Volume Snapshots

### Enable Volume Snapshots

```bash
# Enable snapshots in schedule
velero schedule create with-volumes \
    --schedule="0 2 * * *" \
    --snapshot-volumes=true

# Disable snapshots (metadata only)
velero schedule create metadata-only \
    --schedule="0 * * * *" \
    --snapshot-volumes=false
```

### File System Backup with Restic/Kopia

For volumes that do not support snapshots, use file system backup:

```bash
# Install Velero with Restic support
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.9.0 \
    --bucket my-velero-backups \
    --backup-location-config region=us-east-1 \
    --use-node-agent \
    --default-volumes-to-fs-backup
```

Annotate pods for file system backup:

```yaml
# deployment-with-backup-annotation.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        # Backup specific volumes using file system backup
        backup.velero.io/backup-volumes: data-volume,config-volume
    spec:
      containers:
        - name: app
          volumeMounts:
            - name: data-volume
              mountPath: /data
            - name: config-volume
              mountPath: /config
      volumes:
        - name: data-volume
          persistentVolumeClaim:
            claimName: app-data
        - name: config-volume
          persistentVolumeClaim:
            claimName: app-config
```

### Volume Snapshot Locations

```yaml
# volume-snapshot-location.yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: aws-snapshots
  namespace: velero
spec:
  provider: aws
  config:
    region: us-east-1
---
# Use in schedule
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: multi-region-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    volumeSnapshotLocations:
      - aws-snapshots
    snapshotVolumes: true
```

## Monitoring Backup Status

### Check Schedule Status

```bash
# List all schedules
velero schedule get

# Describe a specific schedule
velero schedule describe daily-backup

# Get schedule details in YAML
kubectl get schedule -n velero daily-backup -o yaml
```

### Check Backup Status

```bash
# List all backups
velero backup get

# List backups from a schedule
velero backup get --selector velero.io/schedule-name=daily-backup

# Describe a specific backup
velero backup describe daily-backup-20260127020000

# View backup logs
velero backup logs daily-backup-20260127020000
```

### Monitoring with Prometheus

```yaml
# velero-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: velero
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: velero
  namespaceSelector:
    matchNames:
      - velero
  endpoints:
    - port: http-monitoring
      interval: 30s
```

### Alerting Rules

```yaml
# velero-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-alerts
  namespace: monitoring
spec:
  groups:
    - name: velero
      rules:
        - alert: VeleroBackupFailed
          expr: |
            increase(velero_backup_failure_total[1h]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Velero backup failed"
            description: "A Velero backup has failed in the last hour"

        - alert: VeleroBackupNotRunning
          expr: |
            time() - velero_backup_last_successful_timestamp > 86400
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "No successful backup in 24 hours"
            description: "Velero has not completed a successful backup in 24 hours"

        - alert: VeleroSchedulePaused
          expr: |
            velero_schedule_paused == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Velero schedule is paused"
```

## Restoring from Backups

### Restore Entire Backup

```bash
# Restore everything from a backup
velero restore create --from-backup daily-backup-20260127020000

# Restore with a custom name
velero restore create my-restore --from-backup daily-backup-20260127020000
```

### Restore Specific Namespaces

```bash
# Restore only specific namespaces
velero restore create --from-backup daily-backup-20260127020000 \
    --include-namespaces production

# Restore to a different namespace
velero restore create --from-backup daily-backup-20260127020000 \
    --namespace-mappings production:production-restored
```

### Restore Specific Resources

```bash
# Restore only deployments and services
velero restore create --from-backup daily-backup-20260127020000 \
    --include-resources deployments,services

# Restore resources matching a label
velero restore create --from-backup daily-backup-20260127020000 \
    --selector app=critical
```

### Restore YAML Definition

```yaml
# restore-config.yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: production-restore
  namespace: velero
spec:
  backupName: daily-backup-20260127020000
  includedNamespaces:
    - production
  excludedResources:
    - nodes
    - events
    - persistentvolumes
  restorePVs: true
  # Map old namespace to new
  namespaceMapping:
    production: production-restored
  # Preserve original node selectors
  preserveNodePorts: true
```

### Check Restore Status

```bash
# List restores
velero restore get

# Describe a restore
velero restore describe my-restore

# View restore logs
velero restore logs my-restore
```

## Best Practices Summary

1. **Use multiple schedules**: Hourly for critical data, daily for full backups, weekly for long-term retention

2. **Set appropriate TTL**: Balance storage costs with recovery needs. Keep at least 7 days of daily backups

3. **Test restores regularly**: Schedule monthly restore drills to verify backup integrity

4. **Monitor backup jobs**: Set up alerts for failed backups and stale schedules

5. **Use namespace selectors**: Back up application namespaces, exclude system namespaces to reduce backup size

6. **Enable volume snapshots**: Use native snapshots where possible, fall back to file system backup for unsupported volumes

7. **Secure credentials**: Store cloud provider credentials in Kubernetes secrets, rotate regularly

8. **Use backup location redundancy**: Configure multiple backup storage locations in different regions

9. **Document recovery procedures**: Create runbooks for common restore scenarios

10. **Label resources for backup**: Use consistent labeling to easily include or exclude resources

---

Velero backup schedules are your safety net against data loss in Kubernetes. Configure them once, monitor them continuously, and test restores regularly.

For comprehensive monitoring of your Velero backup jobs and Kubernetes infrastructure, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you monitor, alert, and respond to issues across your entire stack.
