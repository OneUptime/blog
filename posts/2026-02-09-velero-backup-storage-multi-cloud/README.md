# How to Configure Velero Backup Storage Locations with Multiple Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Multi-Cloud, Backup, Cloud Storage

Description: Learn how to configure Velero with multiple cloud provider storage locations for robust multi-cloud backup strategies. Complete guide covering AWS, Azure, GCP, and hybrid configurations.

---

Multi-cloud backup strategies protect against vendor-specific outages and provide geographic redundancy across cloud providers. Velero supports configuring multiple backup storage locations simultaneously, allowing you to store backups in AWS S3, Azure Blob Storage, Google Cloud Storage, and on-premises object storage within a single cluster. This capability ensures your backup data remains accessible even if one cloud provider experiences regional failures or service disruptions.

## Understanding Multi-Cloud Backup Architecture

Velero's backup storage location abstraction allows you to define multiple storage backends. Each backup can target a specific location, or you can configure automatic replication across locations. This flexibility enables diverse backup strategies including primary/secondary configurations, geographic distribution, and compliance-driven data sovereignty requirements.

When you configure multiple storage locations, Velero treats each as an independent backup repository. You can restore backups from any configured location, providing failover capabilities if your primary storage becomes unavailable.

## Installing Velero with AWS S3 Primary Storage

Start by installing Velero with AWS S3 as the primary storage:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups-primary \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --secret-file ./credentials-aws
```

This creates the default backup storage location using AWS S3.

## Adding Azure Blob Storage as Secondary Location

Install the Azure plugin and configure an additional storage location:

```bash
# Install Azure plugin
velero plugin add velero/velero-plugin-for-microsoft-azure:v1.9.0

# Create Azure credentials secret
kubectl create secret generic azure-credentials \
  --namespace velero \
  --from-file=cloud=./credentials-azure
```

Create Azure backup storage location:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: azure-secondary
  namespace: velero
spec:
  provider: azure
  objectStorage:
    bucket: velero-backups
  config:
    resourceGroup: velero-backups-rg
    storageAccount: velerobackupstorage
    subscriptionId: your-subscription-id
  credential:
    name: azure-credentials
    key: cloud
```

Apply the configuration:

```bash
kubectl apply -f azure-backup-location.yaml

# Verify both locations are available
velero backup-location get
```

## Adding Google Cloud Storage Location

Configure GCP storage as an additional backup location:

```bash
# Install GCP plugin
velero plugin add velero/velero-plugin-for-gcp:v1.9.0

# Create GCP credentials secret
kubectl create secret generic gcp-credentials \
  --namespace velero \
  --from-file=cloud=./credentials-gcp
```

Define GCP backup storage location:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: gcp-tertiary
  namespace: velero
spec:
  provider: gcp
  objectStorage:
    bucket: velero-backups-gcp
    prefix: cluster-backups
  config:
    serviceAccount: velero-backup@project-id.iam.gserviceaccount.com
  credential:
    name: gcp-credentials
    key: cloud
```

Apply and verify:

```bash
kubectl apply -f gcp-backup-location.yaml
velero backup-location get
```

## Creating Backups to Specific Locations

Target specific storage locations when creating backups:

```bash
# Backup to AWS (default)
velero backup create aws-backup \
  --include-namespaces production \
  --storage-location default

# Backup to Azure
velero backup create azure-backup \
  --include-namespaces production \
  --storage-location azure-secondary

# Backup to GCP
velero backup create gcp-backup \
  --include-namespaces production \
  --storage-location gcp-tertiary
```

Each backup stores in its specified location independently.

## Implementing Automated Multi-Location Backups

Create schedules that backup to multiple locations:

```yaml
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: aws-hourly
  namespace: velero
spec:
  schedule: "0 * * * *"
  template:
    ttl: 24h
    includedNamespaces:
    - production
    storageLocation: default
    snapshotVolumes: true
    labels:
      location: aws
      frequency: hourly

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: azure-daily
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 168h
    includedNamespaces:
    - production
    storageLocation: azure-secondary
    defaultVolumesToFsBackup: true
    labels:
      location: azure
      frequency: daily

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: gcp-weekly
  namespace: velero
spec:
  schedule: "0 3 * * 0"
  template:
    ttl: 720h
    includedNamespaces:
    - production
    storageLocation: gcp-tertiary
    defaultVolumesToFsBackup: true
    labels:
      location: gcp
      frequency: weekly
```

This configuration creates hourly backups in AWS, daily in Azure, and weekly in GCP.

## Configuring Storage Location Access Modes

Control how Velero interacts with each location:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: aws-read-only
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-archive
  config:
    region: us-west-2
  # Set to read-only for disaster recovery cluster
  accessMode: ReadOnly
```

Use `ReadWrite` for primary backup locations and `ReadOnly` for secondary/disaster recovery locations.

## Implementing Cross-Region Replication

Configure replication between storage locations for additional redundancy:

**AWS S3 Cross-Region Replication:**

```json
{
  "Role": "arn:aws:iam::123456789012:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "velero-backups/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::velero-backups-replica",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        },
        "Metrics": {
          "Status": "Enabled",
          "EventThreshold": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

Apply replication configuration:

```bash
aws s3api put-bucket-replication \
  --bucket velero-backups-primary \
  --replication-configuration file://replication.json
```

**Azure Blob Storage with Geo-Redundancy:**

```bash
# Enable geo-redundant storage
az storage account update \
  --name velerobackupstorage \
  --resource-group velero-backups-rg \
  --sku Standard_GRS
```

**GCP Cross-Region Bucket:**

```bash
# Create multi-region bucket
gsutil mb -c STANDARD -l US gs://velero-backups-gcp-multi-region/

# Enable versioning
gsutil versioning set on gs://velero-backups-gcp-multi-region/
```

## Managing Credentials for Multiple Providers

Organize credentials for multiple cloud providers:

```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    [default]
    aws_access_key_id=YOUR_AWS_KEY
    aws_secret_access_key=YOUR_AWS_SECRET

---
apiVersion: v1
kind: Secret
metadata:
  name: azure-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    AZURE_SUBSCRIPTION_ID=your-subscription-id
    AZURE_TENANT_ID=your-tenant-id
    AZURE_CLIENT_ID=your-client-id
    AZURE_CLIENT_SECRET=your-client-secret
    AZURE_RESOURCE_GROUP=velero-backups-rg
    AZURE_CLOUD_NAME=AzurePublicCloud

---
apiVersion: v1
kind: Secret
metadata:
  name: gcp-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "velero@your-project-id.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
```

## Monitoring Multi-Cloud Storage Health

Track the health of all backup storage locations:

```bash
# Check all storage locations
velero backup-location get

# Get detailed status
velero backup-location describe default
velero backup-location describe azure-secondary
velero backup-location describe gcp-tertiary

# Check for unavailable locations
kubectl get backupstoragelocations -n velero -o json | \
  jq '.items[] | select(.status.phase != "Available")'
```

Create alerts for storage location failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-storage-alerts
  namespace: velero
spec:
  groups:
  - name: backup-storage
    interval: 60s
    rules:
    - alert: VeleroStorageLocationUnavailable
      expr: |
        velero_backup_storage_location_available == 0
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "Velero storage location unavailable"
        description: "Storage location {{ $labels.storage_location }} has been unavailable for 15 minutes"

    - alert: VeleroMultipleStorageLocationsFailed
      expr: |
        count(velero_backup_storage_location_available == 0) > 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Multiple Velero storage locations failed"
        description: "{{ $value }} storage locations are currently unavailable"
```

## Restoring from Alternative Locations

Restore backups from any configured storage location:

```bash
# List backups from all locations
velero backup get

# Restore from specific location
velero restore create --from-backup azure-backup-20240209 \
  --wait

# Verify restore used correct location
velero restore describe <restore-name> | grep "Storage Location"
```

## Implementing Tiered Backup Strategy

Configure different retention and storage classes per location:

```yaml
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: hot-backups
  namespace: velero
spec:
  schedule: "0 */6 * * *"
  template:
    ttl: 72h
    storageLocation: default
    includedNamespaces:
    - production
    labels:
      tier: hot
      retention: short

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: warm-backups
  namespace: velero
spec:
  schedule: "0 0 * * *"
  template:
    ttl: 720h
    storageLocation: azure-secondary
    includedNamespaces:
    - production
    labels:
      tier: warm
      retention: medium

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: cold-backups
  namespace: velero
spec:
  schedule: "0 0 1 * *"
  template:
    ttl: 8760h
    storageLocation: gcp-tertiary
    includedNamespaces:
    - production
    labels:
      tier: cold
      retention: long
```

This creates a hot/warm/cold backup tier system across multiple cloud providers.

## Cost Optimization Across Providers

Balance costs by leveraging different storage classes:

```yaml
# AWS with Intelligent-Tiering
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: aws-optimized
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
    s3StorageClass: INTELLIGENT_TIERING

# Azure with Cool tier
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: azure-cool
  namespace: velero
spec:
  provider: azure
  objectStorage:
    bucket: velero-backups
  config:
    storageAccount: velerobackups
    resourceGroup: velero-rg
    storageAccountAccessTier: Cool

# GCP with Nearline storage
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: gcp-nearline
  namespace: velero
spec:
  provider: gcp
  objectStorage:
    bucket: velero-backups-nearline
  config:
    storageClass: NEARLINE
```

## Conclusion

Configuring Velero with multiple cloud provider storage locations provides robust disaster recovery capabilities and protects against vendor-specific failures. Implement tiered backup strategies across providers to balance cost and recovery time objectives, configure appropriate access modes for different use cases, and monitor storage location health to ensure continuous backup availability. Multi-cloud backup strategies, combined with cross-region replication and proper credential management, create resilient backup infrastructure that protects your Kubernetes workloads against regional outages, provider failures, and data center disasters.
