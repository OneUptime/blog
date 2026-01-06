# How to Back Up and Restore Kubernetes with Velero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Backup, Disaster Recovery, Velero, Storage, DevOps

Description: A complete guide to backing up and restoring Kubernetes clusters with Velero, including installation, backup strategies, scheduled backups, and disaster recovery procedures.

---

Kubernetes stores state in etcd and persistent volumes. Velero backs up both, enabling you to restore namespaces, migrate clusters, and recover from disasters.

## What Velero Backs Up

- Kubernetes resources (Deployments, Services, ConfigMaps, etc.)
- Persistent Volume data (via snapshots or file-level backup)
- Custom Resource Definitions (CRDs)
- Cluster-scoped resources (optional)

## Installing Velero

### Prerequisites

```bash
# Install Velero CLI
# macOS
brew install velero

# Linux
curl -L https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz | tar xz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/
```

### AWS S3 + EBS Setup

```bash
# Create S3 bucket
aws s3 mb s3://velero-backups-mycompany --region us-west-2

# Create IAM policy
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
            "Resource": "arn:aws:s3:::velero-backups-mycompany/*"
        },
        {
            "Effect": "Allow",
            "Action": ["s3:ListBucket"],
            "Resource": "arn:aws:s3:::velero-backups-mycompany"
        }
    ]
}
EOF

aws iam create-policy --policy-name VeleroPolicy --policy-document file://velero-policy.json

# Create credentials file
cat > credentials-velero <<EOF
[default]
aws_access_key_id=<AWS_ACCESS_KEY>
aws_secret_access_key=<AWS_SECRET_KEY>
EOF

# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups-mycompany \
  --backup-location-config region=us-west-2 \
  --snapshot-location-config region=us-west-2 \
  --secret-file ./credentials-velero
```

### GCP GCS + Persistent Disk Setup

```bash
# Create GCS bucket
gsutil mb gs://velero-backups-mycompany

# Create service account
gcloud iam service-accounts create velero \
  --display-name "Velero service account"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member serviceAccount:velero@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/compute.storageAdmin

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member serviceAccount:velero@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/storage.objectAdmin

# Create key
gcloud iam service-accounts keys create credentials-velero \
  --iam-account velero@$PROJECT_ID.iam.gserviceaccount.com

# Install Velero
velero install \
  --provider gcp \
  --plugins velero/velero-plugin-for-gcp:v1.8.0 \
  --bucket velero-backups-mycompany \
  --secret-file ./credentials-velero
```

### Azure Blob Storage Setup

```bash
# Create storage account and container
az storage account create \
  --name velerobackups \
  --resource-group myResourceGroup \
  --sku Standard_GRS

az storage container create \
  --name velero \
  --account-name velerobackups

# Get storage key
AZURE_STORAGE_KEY=$(az storage account keys list \
  --account-name velerobackups \
  --query "[0].value" -o tsv)

# Create credentials file
cat > credentials-velero <<EOF
AZURE_STORAGE_ACCOUNT_ACCESS_KEY=$AZURE_STORAGE_KEY
AZURE_CLOUD_NAME=AzurePublicCloud
EOF

# Install Velero
velero install \
  --provider azure \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.8.0 \
  --bucket velero \
  --backup-location-config storageAccount=velerobackups \
  --secret-file ./credentials-velero
```

## Creating Backups

### On-Demand Backup

```bash
# Backup entire cluster
velero backup create full-cluster-backup

# Backup specific namespace
velero backup create production-backup --include-namespaces production

# Backup multiple namespaces
velero backup create apps-backup --include-namespaces production,staging

# Backup with label selector
velero backup create critical-apps --selector app=critical

# Backup excluding resources
velero backup create partial-backup \
  --include-namespaces production \
  --exclude-resources secrets,configmaps

# Backup with TTL
velero backup create daily-backup --ttl 168h  # 7 days
```

### Check Backup Status

```bash
# List backups
velero backup get

# Describe backup
velero backup describe production-backup

# View backup logs
velero backup logs production-backup
```

## Scheduled Backups

```bash
# Daily backup at 2 AM
velero schedule create daily-production \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --ttl 168h

# Hourly backup
velero schedule create hourly-backup \
  --schedule="0 * * * *" \
  --include-namespaces production \
  --ttl 24h

# Weekly full backup
velero schedule create weekly-full \
  --schedule="0 0 * * 0" \
  --ttl 720h  # 30 days
```

### Schedule Management

```bash
# List schedules
velero schedule get

# Describe schedule
velero schedule describe daily-production

# Pause schedule
velero schedule pause daily-production

# Unpause schedule
velero schedule unpause daily-production

# Delete schedule
velero schedule delete daily-production
```

## Restoring from Backups

### Full Restore

```bash
# Restore everything from backup
velero restore create --from-backup production-backup

# Restore specific namespace
velero restore create --from-backup full-backup \
  --include-namespaces production

# Restore with new namespace name
velero restore create --from-backup production-backup \
  --namespace-mappings production:production-restored
```

### Selective Restore

```bash
# Restore specific resources
velero restore create --from-backup production-backup \
  --include-resources deployments,services

# Restore excluding resources
velero restore create --from-backup production-backup \
  --exclude-resources persistentvolumeclaims

# Restore with label selector
velero restore create --from-backup production-backup \
  --selector app=frontend
```

### Check Restore Status

```bash
# List restores
velero restore get

# Describe restore
velero restore describe production-restore

# View restore logs
velero restore logs production-restore
```

## Volume Backups

### CSI Snapshots (Recommended)

```yaml
# Enable CSI snapshots in Velero
velero install \
  --features=EnableCSI \
  --plugins velero/velero-plugin-for-csi:v0.6.0,...
```

```yaml
# VolumeSnapshotClass
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-snapshot-class
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Retain
```

### Restic/Kopia File-Level Backup

For storage providers without snapshot support:

```bash
# Install with Restic
velero install \
  --use-node-agent \
  --default-volumes-to-fs-backup

# Or with Kopia (newer, faster)
velero install \
  --use-node-agent \
  --uploader-type=kopia \
  --default-volumes-to-fs-backup
```

**Annotate pods for file backup:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    backup.velero.io/backup-volumes: data,logs
spec:
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: my-pvc
```

## Backup Hooks

### Pre-Backup Hooks

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    pre.hook.backup.velero.io/container: myapp
    pre.hook.backup.velero.io/command: '["/bin/sh", "-c", "pg_dump -U postgres mydb > /backup/dump.sql"]'
    pre.hook.backup.velero.io/timeout: 120s
spec:
  containers:
    - name: myapp
```

### Post-Backup Hooks

```yaml
metadata:
  annotations:
    post.hook.backup.velero.io/container: myapp
    post.hook.backup.velero.io/command: '["/bin/sh", "-c", "rm /backup/dump.sql"]'
```

### Pre-Restore Hooks

```yaml
metadata:
  annotations:
    init.hook.restore.velero.io/container-image: busybox
    init.hook.restore.velero.io/container-name: restore-init
    init.hook.restore.velero.io/command: '["/bin/sh", "-c", "echo preparing restore"]'
```

## Disaster Recovery Procedure

### Step 1: Prepare New Cluster

```bash
# Create new cluster (or use existing DR cluster)
# Install Velero with same configuration
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups-mycompany \
  --backup-location-config region=us-west-2 \
  --secret-file ./credentials-velero
```

### Step 2: Verify Backup Accessibility

```bash
# Check backup location
velero backup-location get

# List available backups
velero backup get
```

### Step 3: Restore Critical Namespaces

```bash
# Restore infrastructure first
velero restore create dr-infra \
  --from-backup latest-backup \
  --include-namespaces cert-manager,ingress-nginx

# Wait for completion
velero restore wait dr-infra

# Restore applications
velero restore create dr-apps \
  --from-backup latest-backup \
  --include-namespaces production

velero restore wait dr-apps
```

### Step 4: Verify Restoration

```bash
# Check restored resources
kubectl get all -n production

# Check PVCs
kubectl get pvc -n production

# Check pods are running
kubectl get pods -n production

# Test application endpoints
curl https://app.example.com/healthz
```

## Cross-Cluster Migration

```bash
# On source cluster: Create backup
velero backup create migration-backup --include-namespaces production

# On destination cluster: Install Velero pointing to same bucket
velero install \
  --provider aws \
  --bucket velero-backups-mycompany \
  ...

# Restore on destination
velero restore create migration-restore --from-backup migration-backup
```

## Monitoring Velero

### Prometheus Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: velero
  namespace: velero
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: velero
  endpoints:
    - port: monitoring
```

### Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-alerts
spec:
  groups:
    - name: velero
      rules:
        - alert: VeleroBackupFailed
          expr: |
            velero_backup_failure_total > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Velero backup failed"

        - alert: VeleroBackupMissing
          expr: |
            time() - velero_backup_last_successful_timestamp > 86400
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "No successful backup in 24 hours"
```

## Best Practices

### 1. Multiple Backup Locations

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: secondary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-dr
  config:
    region: eu-west-1
```

### 2. Backup Validation

```bash
# Regularly test restores
velero restore create test-restore \
  --from-backup production-backup \
  --namespace-mappings production:restore-test

# Verify and cleanup
kubectl get all -n restore-test
kubectl delete namespace restore-test
```

### 3. Retention Policies

```bash
# Short retention for frequent backups
velero schedule create hourly --schedule="0 * * * *" --ttl 24h

# Long retention for daily backups
velero schedule create daily --schedule="0 2 * * *" --ttl 720h
```

### 4. Exclude Unnecessary Resources

```yaml
# Exclude dynamic/derived resources
metadata:
  labels:
    velero.io/exclude-from-backup: "true"
```

### 5. Document and Test DR Procedures

```markdown
## DR Runbook

1. Assess damage and decide on recovery strategy
2. Provision new cluster if needed
3. Install Velero
4. List and select appropriate backup
5. Restore infrastructure namespaces
6. Restore application namespaces
7. Update DNS/load balancers
8. Verify application functionality
9. Notify stakeholders
```

---

Velero is essential for Kubernetes disaster recovery. Start with scheduled backups of your critical namespaces, test restores regularly, and document your DR procedures. The time you invest in backup strategy pays off when you need to recover from a real disaster.
