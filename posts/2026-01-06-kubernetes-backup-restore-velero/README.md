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

Install the Velero CLI on your local machine to interact with Velero installations in your clusters.

```bash
# Install Velero CLI on macOS using Homebrew
# macOS
brew install velero

# Install Velero CLI on Linux by downloading the binary
# Linux
curl -L https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz | tar xz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/
```

### AWS S3 + EBS Setup

This setup creates an S3 bucket for backup storage and configures IAM permissions for Velero to manage backups and EBS snapshots.

```bash
# Create S3 bucket for Velero backup storage
aws s3 mb s3://velero-backups-mycompany --region us-west-2

# Create IAM policy document with required permissions
cat > velero-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",      # Read EBS volume info
                "ec2:DescribeSnapshots",    # Read snapshot info
                "ec2:CreateTags",           # Tag resources
                "ec2:CreateVolume",         # Create volumes from snapshots
                "ec2:CreateSnapshot",       # Create EBS snapshots
                "ec2:DeleteSnapshot"        # Clean up old snapshots
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",             # Download backups
                "s3:DeleteObject",          # Remove old backups
                "s3:PutObject",             # Upload backups
                "s3:AbortMultipartUpload",  # Handle failed uploads
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::velero-backups-mycompany/*"
        },
        {
            "Effect": "Allow",
            "Action": ["s3:ListBucket"],    # List bucket contents
            "Resource": "arn:aws:s3:::velero-backups-mycompany"
        }
    ]
}
EOF

# Create the IAM policy from the JSON file
aws iam create-policy --policy-name VeleroPolicy --policy-document file://velero-policy.json

# Create credentials file for Velero authentication
cat > credentials-velero <<EOF
[default]
aws_access_key_id=<AWS_ACCESS_KEY>
aws_secret_access_key=<AWS_SECRET_KEY>
EOF

# Install Velero with AWS plugin, S3 storage, and EBS snapshots
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups-mycompany \
  --backup-location-config region=us-west-2 \
  --snapshot-location-config region=us-west-2 \
  --secret-file ./credentials-velero
```

### GCP GCS + Persistent Disk Setup

Configure Velero for Google Cloud with GCS bucket storage and Persistent Disk snapshots.

```bash
# Create GCS bucket for backup storage
gsutil mb gs://velero-backups-mycompany

# Create dedicated service account for Velero
gcloud iam service-accounts create velero \
  --display-name "Velero service account"

# Grant storage admin role for snapshot management
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member serviceAccount:velero@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/compute.storageAdmin

# Grant object admin role for GCS bucket access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member serviceAccount:velero@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/storage.objectAdmin

# Create JSON key file for service account authentication
gcloud iam service-accounts keys create credentials-velero \
  --iam-account velero@$PROJECT_ID.iam.gserviceaccount.com

# Install Velero with GCP plugin
velero install \
  --provider gcp \
  --plugins velero/velero-plugin-for-gcp:v1.8.0 \
  --bucket velero-backups-mycompany \
  --secret-file ./credentials-velero
```

### Azure Blob Storage Setup

Set up Velero with Azure Blob Storage for backup storage.

```bash
# Create storage account with geo-redundant storage
az storage account create \
  --name velerobackups \
  --resource-group myResourceGroup \
  --sku Standard_GRS  # Geo-redundant for disaster recovery

# Create container within storage account for Velero
az storage container create \
  --name velero \
  --account-name velerobackups

# Retrieve storage account access key for authentication
AZURE_STORAGE_KEY=$(az storage account keys list \
  --account-name velerobackups \
  --query "[0].value" -o tsv)

# Create credentials file for Velero
cat > credentials-velero <<EOF
AZURE_STORAGE_ACCOUNT_ACCESS_KEY=$AZURE_STORAGE_KEY
AZURE_CLOUD_NAME=AzurePublicCloud
EOF

# Install Velero with Azure plugin
velero install \
  --provider azure \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.8.0 \
  --bucket velero \
  --backup-location-config storageAccount=velerobackups \
  --secret-file ./credentials-velero
```

## Creating Backups

### On-Demand Backup

These commands demonstrate various backup strategies, from full cluster backups to targeted namespace and label-based backups.

```bash
# Backup entire cluster including all namespaces
velero backup create full-cluster-backup

# Backup only the production namespace
velero backup create production-backup --include-namespaces production

# Backup multiple namespaces in a single backup
velero backup create apps-backup --include-namespaces production,staging

# Backup resources matching a specific label
velero backup create critical-apps --selector app=critical

# Backup namespace but exclude sensitive resources
velero backup create partial-backup \
  --include-namespaces production \
  --exclude-resources secrets,configmaps

# Backup with automatic expiration (7 days retention)
velero backup create daily-backup --ttl 168h  # 168 hours = 7 days
```

### Check Backup Status

Monitor your backups to ensure they complete successfully and troubleshoot any issues.

```bash
# List all backups with status
velero backup get

# Show detailed information about a specific backup
velero backup describe production-backup

# View backup operation logs for troubleshooting
velero backup logs production-backup
```

## Scheduled Backups

Automated schedules ensure consistent backup coverage without manual intervention.

```bash
# Daily backup of production at 2 AM with 7-day retention
velero schedule create daily-production \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --ttl 168h

# Hourly backup for high-change environments with 24-hour retention
velero schedule create hourly-backup \
  --schedule="0 * * * *" \
  --include-namespaces production \
  --ttl 24h

# Weekly full backup on Sundays with 30-day retention
velero schedule create weekly-full \
  --schedule="0 0 * * 0" \
  --ttl 720h  # 720 hours = 30 days
```

### Schedule Management

Manage backup schedules to pause during maintenance windows or adjust backup policies.

```bash
# List all configured schedules
velero schedule get

# View schedule details including last execution
velero schedule describe daily-production

# Pause schedule during maintenance window
velero schedule pause daily-production

# Resume schedule after maintenance
velero schedule unpause daily-production

# Remove schedule when no longer needed
velero schedule delete daily-production
```

## Restoring from Backups

### Full Restore

Restore operations recreate Kubernetes resources and optionally persistent volume data from backups.

```bash
# Restore all resources from a backup
velero restore create --from-backup production-backup

# Restore only specific namespace from a full backup
velero restore create --from-backup full-backup \
  --include-namespaces production

# Restore to a different namespace (useful for testing)
velero restore create --from-backup production-backup \
  --namespace-mappings production:production-restored
```

### Selective Restore

Granular restore options allow you to recover specific resources without affecting others.

```bash
# Restore only deployments and services, skip other resources
velero restore create --from-backup production-backup \
  --include-resources deployments,services

# Restore everything except persistent volume claims
velero restore create --from-backup production-backup \
  --exclude-resources persistentvolumeclaims

# Restore only resources matching a label selector
velero restore create --from-backup production-backup \
  --selector app=frontend
```

### Check Restore Status

Monitor restore progress and verify successful completion.

```bash
# List all restore operations
velero restore get

# View restore details and progress
velero restore describe production-restore

# Check restore logs for errors or warnings
velero restore logs production-restore
```

## Volume Backups

### CSI Snapshots (Recommended)

CSI snapshots provide native, storage-provider-integrated volume backups. Enable the CSI feature flag during Velero installation.

```yaml
# Enable CSI snapshots in Velero installation command
velero install \
  --features=EnableCSI \
  --plugins velero/velero-plugin-for-csi:v0.6.0,...
```

Create a VolumeSnapshotClass that Velero will use for CSI snapshots. The label tells Velero which class to use.

```yaml
# VolumeSnapshotClass configuration for Velero
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-snapshot-class
  labels:
    velero.io/csi-volumesnapshot-class: "true"  # Velero uses this label to find the class
driver: ebs.csi.aws.com  # CSI driver for your storage provider
deletionPolicy: Retain  # Keep snapshots when VolumeSnapshot is deleted
```

### Restic/Kopia File-Level Backup

For storage providers without snapshot support, use file-level backup with Restic or Kopia.

```bash
# Install with Restic for file-level volume backup
velero install \
  --use-node-agent \                    # Deploy node agent for file access
  --default-volumes-to-fs-backup        # Enable filesystem backup by default

# Or with Kopia (newer, faster alternative to Restic)
velero install \
  --use-node-agent \
  --uploader-type=kopia \               # Use Kopia instead of Restic
  --default-volumes-to-fs-backup
```

**Annotate pods for file backup:**

This annotation tells Velero which volumes to back up using file-level backup. List the volume names to include.

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    # Specify which volumes to backup (comma-separated list)
    backup.velero.io/backup-volumes: data,logs
spec:
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: my-pvc  # PVC that will be backed up
```

## Backup Hooks

### Pre-Backup Hooks

Pre-backup hooks run commands before the backup starts. Use them to create consistent database dumps or quiesce applications.

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    # Container to run the hook in
    pre.hook.backup.velero.io/container: myapp
    # Command to execute before backup (must be JSON array format)
    pre.hook.backup.velero.io/command: '["/bin/sh", "-c", "pg_dump -U postgres mydb > /backup/dump.sql"]'
    # Maximum time to wait for hook completion
    pre.hook.backup.velero.io/timeout: 120s
spec:
  containers:
    - name: myapp
```

### Post-Backup Hooks

Post-backup hooks run after the backup completes. Use them to clean up temporary files or resume operations.

```yaml
metadata:
  annotations:
    # Container to run post-backup cleanup
    post.hook.backup.velero.io/container: myapp
    # Remove temporary dump file after backup
    post.hook.backup.velero.io/command: '["/bin/sh", "-c", "rm /backup/dump.sql"]'
```

### Pre-Restore Hooks

Pre-restore hooks run before resources are restored. Use init containers to prepare the environment.

```yaml
metadata:
  annotations:
    # Image to use for the init container
    init.hook.restore.velero.io/container-image: busybox
    # Name for the init container
    init.hook.restore.velero.io/container-name: restore-init
    # Command to prepare for restore
    init.hook.restore.velero.io/command: '["/bin/sh", "-c", "echo preparing restore"]'
```

## Disaster Recovery Procedure

### Step 1: Prepare New Cluster

Set up Velero in the recovery cluster pointing to the same backup storage location.

```bash
# Create new cluster (or use existing DR cluster)
# Install Velero with identical configuration to access existing backups
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups-mycompany \
  --backup-location-config region=us-west-2 \
  --secret-file ./credentials-velero
```

### Step 2: Verify Backup Accessibility

Confirm the recovery cluster can access backup storage and see available backups.

```bash
# Verify backup storage location is accessible
velero backup-location get

# List all available backups from the shared storage
velero backup get
```

### Step 3: Restore Critical Namespaces

Restore infrastructure components first, then application workloads. This ordering ensures dependencies are available.

```bash
# Restore infrastructure components first (certificates, ingress)
velero restore create dr-infra \
  --from-backup latest-backup \
  --include-namespaces cert-manager,ingress-nginx

# Wait for infrastructure restore to complete
velero restore wait dr-infra

# Restore application workloads after infrastructure is ready
velero restore create dr-apps \
  --from-backup latest-backup \
  --include-namespaces production

# Wait for application restore to complete
velero restore wait dr-apps
```

### Step 4: Verify Restoration

Validate that all resources are restored and applications are functioning correctly.

```bash
# List all resources in restored namespace
kubectl get all -n production

# Verify persistent volume claims are bound
kubectl get pvc -n production

# Confirm pods are running and ready
kubectl get pods -n production

# Test application health endpoint
curl https://app.example.com/healthz
```

## Cross-Cluster Migration

Velero enables cluster-to-cluster migration by sharing the same backup storage location.

```bash
# On source cluster: Create backup of namespace to migrate
velero backup create migration-backup --include-namespaces production

# On destination cluster: Install Velero pointing to same bucket
velero install \
  --provider aws \
  --bucket velero-backups-mycompany \
  ...

# On destination cluster: Restore from the migration backup
velero restore create migration-restore --from-backup migration-backup
```

## Monitoring Velero

### Prometheus Metrics

Configure Prometheus to scrape Velero metrics for monitoring and alerting.

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: velero
  namespace: velero
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: velero  # Match Velero service
  endpoints:
    - port: monitoring  # Metrics port exposed by Velero
```

### Alerts

Set up alerts to notify on backup failures or missed backups.

```yaml
# PrometheusRule for Velero alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-alerts
spec:
  groups:
    - name: velero
      rules:
        # Alert when any backup fails
        - alert: VeleroBackupFailed
          expr: |
            velero_backup_failure_total > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Velero backup failed"

        # Alert when no successful backup in 24 hours
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

Configure secondary backup location in a different region for geographic redundancy.

```yaml
# Secondary backup storage location in different region
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: secondary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-dr  # Separate bucket in DR region
  config:
    region: eu-west-1  # Different region from primary
```

### 2. Backup Validation

Regularly test restores to ensure backups are valid and complete.

```bash
# Restore to test namespace to validate backup
velero restore create test-restore \
  --from-backup production-backup \
  --namespace-mappings production:restore-test

# Verify restored resources are functional
kubectl get all -n restore-test

# Clean up test namespace after validation
kubectl delete namespace restore-test
```

### 3. Retention Policies

Configure appropriate TTL values based on backup frequency.

```bash
# Short retention for frequent hourly backups
velero schedule create hourly --schedule="0 * * * *" --ttl 24h

# Longer retention for daily backups (30 days)
velero schedule create daily --schedule="0 2 * * *" --ttl 720h
```

### 4. Exclude Unnecessary Resources

Use labels to exclude dynamic or derived resources that don't need backup.

```yaml
# Label resources to exclude from backups
metadata:
  labels:
    velero.io/exclude-from-backup: "true"  # Velero will skip this resource
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
