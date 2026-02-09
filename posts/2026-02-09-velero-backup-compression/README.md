# How to Implement Velero Backup Compression to Reduce Storage Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Backup, Cost Optimization

Description: Learn how to implement Velero backup compression to reduce storage costs, optimize backup transfer times, and minimize cloud storage expenses while maintaining effective disaster recovery capabilities.

---

Kubernetes backups can consume significant storage space, especially when backing up large persistent volumes or clusters with many resources. Velero supports compression at multiple levels, reducing storage costs and improving backup transfer efficiency without sacrificing disaster recovery capabilities.

## Understanding Velero Compression

Velero compresses backup data in two ways:

- Resource compression: Kubernetes resources (deployments, services, configmaps, etc.) are gzipped before upload
- Volume snapshot data compression: Some volume snapshot providers support compression

Resource compression happens automatically, but you can optimize it further.

## Enabling Gzip Compression

Velero enables gzip compression by default for all backed-up resources:

```bash
# Verify compression is enabled (default behavior)
kubectl get deployment velero -n velero -o yaml | grep -A 5 "args:"
```

The Velero server automatically compresses all JSON data before storing it in object storage.

## Configuring Compression Level

While Velero uses default compression, you can influence the storage efficiency:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
    # S3 automatically compresses objects
```

For larger savings, use object storage lifecycle policies to compress older backups:

```json
{
  "Rules": [
    {
      "Id": "CompressOldBackups",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## Using Restic for Compressed File-Level Backups

Restic provides built-in compression for file-level backups:

```bash
# Install Velero with Restic
velero install \
  --provider aws \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --use-node-agent
```

Enable restic backup for pods with annotation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  annotations:
    backup.velero.io/backup-volumes: data,config
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: data
      mountPath: /data
    - name: config
      mountPath: /config
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
  - name: config
    configMap:
      name: app-config
```

Restic automatically compresses and deduplicates volume data:

```bash
# Create backup with restic
velero backup create compressed-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup
```

## Optimizing Backup Size

Reduce backup size by excluding unnecessary data:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: optimized-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    excludedResources:
    - events
    - events.events.k8s.io
    - pods  # Recreated from deployments
    - replicasets  # Covered by deployments
    ttl: 168h0m0s
```

This can reduce backup size by 30-50% by excluding ephemeral resources.

## Implementing Storage Class Tiering

Use different storage classes for different backup ages:

```bash
# Apply S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket velero-backups \
  --lifecycle-configuration file://lifecycle.json
```

Lifecycle policy:

```json
{
  "Rules": [
    {
      "Id": "TierBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "backups/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 30,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

This automatically moves backups to cheaper storage tiers as they age.

## Measuring Compression Effectiveness

Track compression ratios:

```bash
#!/bin/bash
# measure-compression.sh

BACKUP_NAME=$1

# Get backup details
velero backup describe $BACKUP_NAME -o json > /tmp/backup.json

# Extract total items
ITEMS=$(jq -r '.status.totalItems' /tmp/backup.json)

# Get backup size from S3
BUCKET=$(jq -r '.spec.storageLocation' /tmp/backup.json)
BACKUP_PATH="backups/${BACKUP_NAME}/"

SIZE=$(aws s3 ls s3://velero-backups/${BACKUP_PATH} --recursive --summarize | \
  grep "Total Size" | awk '{print $3}')

echo "Backup: $BACKUP_NAME"
echo "Items: $ITEMS"
echo "Compressed size: $(numfmt --to=iec-i --suffix=B $SIZE)"
echo "Average per item: $(numfmt --to=iec-i --suffix=B $((SIZE / ITEMS)))"
```

## Deduplication with Restic

Restic provides automatic deduplication:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: deduplicated-backup
  namespace: velero
spec:
  schedule: "0 * * * *"  # Hourly
  template:
    includedNamespaces:
    - production
    defaultVolumesToFsBackup: true  # Use restic for deduplication
    ttl: 72h0m0s
```

Restic only stores changed data chunks, significantly reducing storage for incremental backups.

## Monitoring Backup Storage Usage

Track storage consumption over time:

```python
#!/usr/bin/env python3
# backup-storage-report.py

import boto3
from datetime import datetime, timedelta

s3 = boto3.client('s3')
bucket = 'velero-backups'

def get_storage_stats():
    """Calculate backup storage statistics."""

    paginator = s3.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket, Prefix='backups/')

    total_size = 0
    backup_count = 0
    storage_by_age = {'week': 0, 'month': 0, 'older': 0}

    now = datetime.now(datetime.timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    for page in pages:
        for obj in page.get('Contents', []):
            size = obj['Size']
            modified = obj['LastModified']
            total_size += size

            if 'velero-backup.json' in obj['Key']:
                backup_count += 1

            if modified > week_ago:
                storage_by_age['week'] += size
            elif modified > month_ago:
                storage_by_age['month'] += size
            else:
                storage_by_age['older'] += size

    print(f"Total backups: {backup_count}")
    print(f"Total storage: {total_size / (1024**3):.2f} GB")
    print(f"Last week: {storage_by_age['week'] / (1024**3):.2f} GB")
    print(f"Last month: {storage_by_age['month'] / (1024**3):.2f} GB")
    print(f"Older: {storage_by_age['older'] / (1024**3):.2f} GB")

    avg_size = total_size / backup_count if backup_count > 0 else 0
    print(f"Average backup size: {avg_size / (1024**2):.2f} MB")

if __name__ == '__main__':
    get_storage_stats()
```

## Cost Analysis

Calculate storage costs with compression:

```python
def calculate_costs(uncompressed_gb, compression_ratio, days_retained):
    """Calculate monthly backup costs with compression."""

    compressed_gb = uncompressed_gb / compression_ratio
    daily_backups = 1  # One backup per day

    # S3 Standard pricing (example)
    standard_price = 0.023  # per GB per month
    standard_days = 7
    ia_price = 0.0125  # per GB per month
    ia_days = 23

    # Calculate costs
    standard_cost = compressed_gb * daily_backups * standard_days * (standard_price / 30)
    ia_cost = compressed_gb * daily_backups * ia_days * (ia_price / 30)

    total_monthly = standard_cost + ia_cost

    print(f"Uncompressed size: {uncompressed_gb} GB")
    print(f"Compressed size: {compressed_gb:.1f} GB")
    print(f"Compression ratio: {compression_ratio}:1")
    print(f"Monthly cost: ${total_monthly:.2f}")
    print(f"Savings from compression: ${(uncompressed_gb - compressed_gb) * standard_price:.2f}/month")

# Example: 100GB daily backup, 3:1 compression, 30 day retention
calculate_costs(100, 3, 30)
```

## Configuring Azure Blob Storage Tiering

For Azure, configure storage tiers:

```bash
# Create storage account with archive tier
az storage account create \
  --name velerostorageaccount \
  --resource-group velero-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Configure lifecycle management
az storage account management-policy create \
  --account-name velerostorageaccount \
  --policy @lifecycle-policy.json
```

Lifecycle policy:

```json
{
  "rules": [
    {
      "enabled": true,
      "name": "TierBackups",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 7
            },
            "tierToArchive": {
              "daysAfterModificationGreaterThan": 30
            },
            "delete": {
              "daysAfterModificationGreaterThan": 90
            }
          }
        },
        "filters": {
          "prefixMatch": ["backups/"]
        }
      }
    }
  ]
}
```

## Using GCS Storage Classes

For Google Cloud Storage:

```bash
# Set up lifecycle configuration
gsutil lifecycle set lifecycle.json gs://velero-backups
```

Lifecycle configuration:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 7,
          "matchesPrefix": ["backups/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": ["backups/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "ARCHIVE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": ["backups/"]
        }
      }
    ]
  }
}
```

## Best Practices for Backup Compression

Follow these practices to optimize compression:

1. **Use Restic for file-level backups**: Provides compression and deduplication
2. **Exclude unnecessary resources**: Don't backup ephemeral data
3. **Implement storage tiering**: Move old backups to cheaper storage
4. **Monitor compression ratios**: Track effectiveness over time
5. **Use volume snapshots wisely**: Some storage systems compress better than others
6. **Test restore performance**: Compressed backups may take longer to restore

## Optimizing Volume Snapshots

For CSI volume snapshots, enable compression at the storage level:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: compressed-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  # EBS automatically compresses snapshots
volumeBindingMode: WaitForFirstConsumer
```

## Conclusion

Velero backup compression reduces storage costs through multiple mechanisms: automatic gzip compression of resources, Restic deduplication for file-level backups, and cloud storage tiering for long-term retention. By combining these approaches with smart exclusion policies, you can significantly reduce backup storage costs while maintaining comprehensive disaster recovery coverage.

Start with basic exclusion policies to reduce backup size, then implement Restic for volumes that benefit from deduplication, and finally configure storage lifecycle policies to automatically tier aging backups to cheaper storage classes. Monitor your compression ratios and storage costs regularly to optimize your backup strategy over time.
