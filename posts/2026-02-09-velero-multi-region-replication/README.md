# How to Use Multi-Region Velero Backup Replication for Geographic Redundancy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Disaster Recovery, Multi-Region

Description: Learn how to implement multi-region Velero backup replication to achieve geographic redundancy, protecting your Kubernetes workloads from regional failures and ensuring business continuity.

---

Regional cloud outages, though rare, can be catastrophic if your disaster recovery strategy relies on backups stored in the same region as your production workload. Multi-region backup replication ensures that even if an entire region becomes unavailable, you can recover your Kubernetes workloads from backups stored in a different geographic location.

## Why Multi-Region Replication Matters

A single-region backup strategy has a critical weakness: if the region hosting both your cluster and backups becomes unavailable, you cannot recover. Multi-region replication protects against:

- Regional cloud provider outages
- Natural disasters affecting entire datacenters
- Network partitions isolating a region
- Compliance requirements for geographic data distribution

By storing backup copies in multiple regions, you ensure true disaster recovery capability.

## Understanding Velero Backup Storage Locations

Velero uses BackupStorageLocation resources to define where backups are stored. You can configure multiple storage locations, each pointing to different regions:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary-us-east
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-us-east-1
  config:
    region: us-east-1
---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: replica-us-west
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-us-west-2
  config:
    region: us-west-2
```

Remember that Velero backups can include both object-storage data and persistent volume data. Cloud-provider volume snapshots are managed through VolumeSnapshotLocation resources and usually cannot be created in a different region from the volume. If you need full geographic redundancy for persistent volumes, use Velero file system backups so volume data is stored in the object store, or replicate/copy volume snapshots separately.

## Method 1: S3 Cross-Region Replication

The most efficient approach uses cloud provider native replication. For AWS S3, configure Cross-Region Replication (CRR):

Enable versioning on both buckets first (required for CRR):

```bash
aws s3api put-bucket-versioning \
  --bucket velero-backups-us-east-1 \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket velero-backups-us-west-2 \
  --versioning-configuration Status=Enabled
```

```json
{
  "Role": "arn:aws:iam::ACCOUNT:role/velero-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": ""
      },
      "DeleteMarkerReplication": {
        "Status": "Disabled"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::velero-backups-us-west-2",
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

Apply this to your primary S3 bucket:

```bash
# Save the policy as replication-policy.json

aws s3api put-bucket-replication \
  --bucket velero-backups-us-east-1 \
  --replication-configuration file://replication-policy.json
```

## Method 2: Velero Multi-Location Backups

Configure Velero to create separate backups in multiple locations using backup schedules:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-backup-primary
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 720h0m0s
    storageLocation: primary-us-east
    includedNamespaces:
    - production
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-backup-replica
  namespace: velero
spec:
  schedule: "0 3 * * *"  # Run 1 hour after primary
  template:
    ttl: 720h0m0s
    storageLocation: replica-us-west
    includedNamespaces:
    - production
```

This creates independent object-storage backups in each region. While it uses more storage and backup time, it provides regional independence for Kubernetes metadata and any file system backup repositories stored in the selected BackupStorageLocation. Cloud-provider volume snapshots still need their own regional replication or copy process.

## Method 3: Script-Based Replication

For more control, use a custom script that syncs backups between regions:

```bash
#!/bin/bash
# velero-backup-sync.sh

SOURCE_BUCKET="velero-backups-us-east-1"
DEST_BUCKET="velero-backups-us-west-2"
SOURCE_REGION="us-east-1"
DEST_REGION="us-west-2"
VELERO_PREFIX="" # Set this if your BackupStorageLocation uses objectStorage.prefix

# Sync the full Velero object-storage prefix, including backup metadata and
# file system backup repositories when they are stored in the bucket.
aws s3 sync \
  s3://${SOURCE_BUCKET}/${VELERO_PREFIX} \
  s3://${DEST_BUCKET}/${VELERO_PREFIX} \
  --source-region ${SOURCE_REGION} \
  --region ${DEST_REGION}
```

Deploy this as a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: velero-backup-sync
  namespace: velero
spec:
  schedule: "0 4 * * *"  # Run at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero-backup-sync
          containers:
          - name: sync
            image: amazon/aws-cli:latest
            command:
            - /bin/bash
            - /scripts/velero-backup-sync.sh
            volumeMounts:
            - name: sync-script
              mountPath: /scripts
          restartPolicy: OnFailure
          volumes:
          - name: sync-script
            configMap:
              name: velero-sync-script
              defaultMode: 0755
```

## Configuring GCS Multi-Region Replication

For Google Cloud Storage, use dual-region or multi-region buckets:

```bash
# Create a multi-region bucket
gsutil mb -c STANDARD -l US gs://velero-backups-multi-region

# Or create separate regional buckets and sync
gsutil mb -c STANDARD -l us-east1 gs://velero-backups-us-east
gsutil mb -c STANDARD -l us-west1 gs://velero-backups-us-west

# Set up bucket-to-bucket replication using Cloud Storage Transfer
gcloud transfer jobs create gs://velero-backups-us-east \
  gs://velero-backups-us-west \
  --schedule-repeats-every=24h
```

## Azure Blob Storage Replication

Azure Storage accounts support geographic redundancy natively:

```bash
# Create storage account with RA-GRS for read access to the secondary region
az storage account create \
  --name veleroblueprimaryragrs \
  --resource-group velero-rg \
  --location eastus \
  --sku Standard_RAGRS \
  --kind StorageV2

# Or use RA-GZRS for read-access geo-zone-redundant storage
az storage account create \
  --name veleroblueprimaryragzrs \
  --resource-group velero-rg \
  --location eastus \
  --sku Standard_RAGZRS \
  --kind StorageV2
```

Configure Velero to use the RA-GRS storage account:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: azure-ragrs
  namespace: velero
spec:
  provider: azure
  objectStorage:
    bucket: velero-backups
  config:
    resourceGroup: velero-rg
    storageAccount: veleroblueprimaryragrs
```

## Verifying Multi-Region Replication

Monitor replication status to ensure backups reach all regions:

```bash
# Check primary location
velero backup-location get primary-us-east

# Check replica location
velero backup-location get replica-us-west

# List backups in each location
velero backup get -l velero.io/storage-location=primary-us-east
velero backup get -l velero.io/storage-location=replica-us-west
```

Create a monitoring script:

```bash
#!/bin/bash
# verify-replication.sh

PRIMARY_LOCATION="primary-us-east"
REPLICA_LOCATION="replica-us-west"

PRIMARY_COUNT=$(velero backup get -l velero.io/storage-location=$PRIMARY_LOCATION -o json | jq '.items | length')
REPLICA_COUNT=$(velero backup get -l velero.io/storage-location=$REPLICA_LOCATION -o json | jq '.items | length')

if [ "$PRIMARY_COUNT" -ne "$REPLICA_COUNT" ]; then
  echo "WARNING: Backup count mismatch - Primary: $PRIMARY_COUNT, Replica: $REPLICA_COUNT"
  exit 1
fi

echo "Replication verified - $PRIMARY_COUNT backups in each location"
```

## Testing Regional Failover

Regularly test your ability to recover from the replica region:

```bash
# Simulate primary region unavailable
kubectl patch backupstoragelocation primary-us-east -n velero \
  --type merge \
  --patch '{"spec":{"accessMode":"ReadOnly"}}'

# Confirm the backup has been synced from the replica location, then restore it
velero backup describe production-backup-20260209

velero restore create test-restore \
  --from-backup production-backup-20260209
```

## Cost Considerations

Multi-region replication increases costs through:

- Storage costs in multiple regions
- Data transfer fees between regions
- Replication service charges

Optimize costs by:

- Using lifecycle policies to age out old backups
- Using Velero file system backup deduplication or storage-class transitions where supported
- Replicating only critical workloads to multiple regions
- Using cheaper storage tiers for older replicated backups

## Conclusion

Multi-region backup replication transforms Velero from a cluster-level disaster recovery tool into a true regional failure protection system. Whether you use native cloud replication, multiple Velero backup locations, or custom sync scripts, geographic redundancy ensures your backups survive even catastrophic regional outages.

Start with S3 Cross-Region Replication or GCS multi-region buckets for simplicity, then add custom replication logic if you need more control. Always test your failover procedures and monitor replication status to ensure your geographic redundancy works when you need it most.
