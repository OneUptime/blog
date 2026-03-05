# How to Create and Restore Backups for Google Cloud Filestore Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, Backup, Disaster Recovery, NFS

Description: A complete guide to creating, managing, and restoring backups for Google Cloud Filestore instances to protect your shared file data against loss.

---

Filestore backups give you a way to protect your NFS data against accidental deletion, corruption, or disaster scenarios. Unlike snapshots, which are tied to the same instance, Filestore backups are stored independently and can be used to restore data to a completely new instance in any region. This makes them a critical component of any disaster recovery plan for workloads that rely on Filestore.

In this post, I will cover how to create backups, schedule them, restore from a backup, and understand the cost implications.

## How Filestore Backups Work

A Filestore backup is a full copy of the file share at a point in time. The first backup captures everything. Subsequent backups are incremental at the storage level, meaning they only consume space for the data that changed since the last backup. However, each backup appears as a full, independent copy from your perspective. Deleting one backup does not affect others.

Backups are stored in a Google-managed storage location separate from the Filestore instance. This means your backup survives even if the original instance is deleted.

## Prerequisites

- A running Filestore instance
- The `roles/file.editor` IAM role on your project
- The gcloud CLI installed and authenticated

## Creating a Backup

Creating a backup is a single command:

```bash
# Create a backup of a Filestore instance
gcloud filestore backups create my-backup \
  --instance=my-filestore \
  --instance-zone=us-central1-a \
  --file-share=vol1 \
  --region=us-central1
```

Let me explain the parameters:

- `my-backup` - A name for this backup
- `--instance` - The Filestore instance to back up
- `--instance-zone` - The zone of the source instance
- `--file-share` - The name of the file share to back up
- `--region` - Where to store the backup (can be different from the instance zone)

The backup runs in the background and does not block access to the Filestore instance. Your applications can continue reading and writing during the backup process. The backup captures a consistent point-in-time snapshot of the data.

Monitor the backup progress:

```bash
# Check the status of the backup
gcloud filestore backups describe my-backup \
  --region=us-central1
```

The state will show `CREATING` while the backup is in progress and `READY` when it is complete.

## Listing Backups

To see all backups in a region:

```bash
# List all Filestore backups in a region
gcloud filestore backups list --region=us-central1

# List backups with more detail
gcloud filestore backups list \
  --region=us-central1 \
  --format="table(name,sourceInstance,sourceFileShare,state,capacityGb,createTime)"
```

## Creating Cross-Region Backups

One of the strengths of Filestore backups is that you can store them in a different region than the source instance. This is essential for disaster recovery:

```bash
# Create a backup in a different region for DR purposes
gcloud filestore backups create my-dr-backup \
  --instance=my-filestore \
  --instance-zone=us-central1-a \
  --file-share=vol1 \
  --region=us-east1
```

Now even if the entire us-central1 region has an outage, your backup is safe in us-east1 and you can restore from it.

## Restoring a Backup to a New Instance

To restore data from a backup, you create a new Filestore instance using the backup as the source:

```bash
# Restore a backup to a new Filestore instance
gcloud filestore instances restore my-new-filestore \
  --zone=us-central1-a \
  --file-share=name=vol1,capacity=1TB,source-backup=my-backup,source-backup-region=us-central1
```

Wait, that syntax looks complicated. Let me break it down more clearly with the actual restore command:

```bash
# Restore a backup onto an existing Filestore instance
# WARNING: This overwrites all data on the target file share
gcloud filestore instances restore my-filestore \
  --zone=us-central1-a \
  --file-share=vol1 \
  --source-backup=my-backup \
  --source-backup-region=us-central1
```

This command restores the backup data onto the specified file share of an existing instance. The target instance must have at least as much capacity as the backup's source data.

To restore to a new instance, create the instance first and then restore:

```bash
# Step 1: Create a new instance with enough capacity
gcloud filestore instances create my-restored-filestore \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=vol1,capacity=1TB \
  --network=name=default

# Step 2: Restore the backup onto the new instance
gcloud filestore instances restore my-restored-filestore \
  --zone=us-central1-a \
  --file-share=vol1 \
  --source-backup=my-backup \
  --source-backup-region=us-central1
```

## Automating Backups with Cloud Scheduler

For production workloads, you want backups to happen on a schedule. You can use Cloud Scheduler with Cloud Functions to automate this.

First, create a Cloud Function that triggers a backup:

```python
# Cloud Function to create a Filestore backup
# Triggered by Cloud Scheduler via Pub/Sub
import datetime
from google.cloud import filestore_v1

def create_filestore_backup(event, context):
    """Creates a Filestore backup with a timestamped name."""
    client = filestore_v1.CloudFilestoreManagerClient()

    # Generate a unique backup name with timestamp
    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_id = f'auto-backup-{timestamp}'

    parent = 'projects/my-project/locations/us-central1'
    source_instance = 'projects/my-project/locations/us-central1-a/instances/my-filestore'

    backup = filestore_v1.Backup(
        source_instance=source_instance,
        source_file_share='vol1',
    )

    # Start the backup operation
    operation = client.create_backup(
        parent=parent,
        backup=backup,
        backup_id=backup_id,
    )

    print(f'Started backup: {backup_id}')
    result = operation.result()  # Wait for completion
    print(f'Backup completed: {result.name}')
```

Then set up a Cloud Scheduler job that triggers this function daily:

```bash
# Create a Pub/Sub topic for triggering backups
gcloud pubsub topics create filestore-backup-trigger

# Create a Cloud Scheduler job that fires daily at 2 AM
gcloud scheduler jobs create pubsub daily-filestore-backup \
  --schedule="0 2 * * *" \
  --topic=filestore-backup-trigger \
  --message-body="backup" \
  --time-zone="UTC"
```

## Managing Backup Retention

Backups cost money based on the amount of data stored. You should implement a retention policy to delete old backups:

```bash
# Delete a specific backup
gcloud filestore backups delete my-old-backup --region=us-central1

# List backups older than 30 days (for manual review)
gcloud filestore backups list \
  --region=us-central1 \
  --filter="createTime < '2026-01-17'" \
  --format="value(name)"
```

You can automate retention by adding cleanup logic to your backup Cloud Function or creating a separate scheduled function that deletes backups older than your retention period.

## Backup Size and Cost Considerations

The first backup is roughly equal to the amount of data on the file share (not the provisioned capacity). Incremental backups only store changed data. You can check the size of a backup:

```bash
# Check the storage consumed by a backup
gcloud filestore backups describe my-backup \
  --region=us-central1 \
  --format="value(capacityGb,storageBytes)"
```

The `capacityGb` field shows the source instance capacity, while `storageBytes` shows the actual data stored in the backup.

## Best Practices

1. Take backups before any major changes to the data on the file share.
2. Store at least one backup in a different region for disaster recovery.
3. Test your restore procedure periodically - a backup you cannot restore from is worthless.
4. Implement automated backup scheduling and retention cleanup.
5. Label your backups with metadata about what triggered them (manual, scheduled, pre-deployment).

Filestore backups are straightforward to use and provide strong protection for your shared file data. The combination of automated scheduling, cross-region storage, and the ability to restore to new instances gives you a solid foundation for data protection.
