# How to Copy an RDS Snapshot to Another Region

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Disaster Recovery, Database, Snapshots

Description: Learn how to copy Amazon RDS snapshots across AWS regions for disaster recovery, compliance, and migration purposes using the AWS Console and CLI.

---

If you're running production databases on Amazon RDS, keeping backups in a single region is a risk you can't afford. A regional outage, accidental deletion, or compliance requirement could leave you scrambling. Copying RDS snapshots to another region is one of the simplest and most effective disaster recovery strategies available.

In this post, we'll walk through why cross-region snapshot copies matter, how to do them manually, and how to automate the whole process so you never have to think about it again.

## Why Copy Snapshots Across Regions?

There are a few good reasons to maintain snapshot copies in a different region:

- **Disaster recovery**: If an entire AWS region goes down, you've still got a backup sitting somewhere else. You can spin up a new RDS instance from that snapshot in minutes.
- **Compliance**: Some regulatory frameworks require geographic separation of backups. Healthcare, finance, and government workloads often have these mandates.
- **Migration**: If you're moving your infrastructure to a new region, copying a snapshot is often the easiest way to bring your data along.
- **Testing**: You might want to stand up a copy of production in a different region for load testing or staging without impacting your primary environment.

## Prerequisites

Before you start, make sure you have:

- An existing RDS instance with at least one snapshot (either automated or manual)
- Appropriate IAM permissions including `rds:CopyDBSnapshot` and `rds:DescribeDBSnapshots`
- If your snapshot is encrypted, the KMS key must allow cross-region operations

## Copy a Snapshot Using the AWS Console

The console approach is straightforward. Head to the RDS section of the AWS Console:

1. Navigate to **Snapshots** in the left sidebar
2. Select the snapshot you want to copy
3. Click **Actions** then **Copy Snapshot**
4. In the **Destination Region** dropdown, pick your target region
5. Give the copy a meaningful name - something like `mydb-snapshot-us-west-2-backup`
6. If the source snapshot is encrypted, you'll need to choose a KMS key in the destination region
7. Click **Copy Snapshot**

The copy process runs in the background. Depending on the size of your database, it can take anywhere from a few minutes to several hours.

## Copy a Snapshot Using the AWS CLI

For most teams, the CLI approach is more practical since it can be scripted and automated.

Here's the basic command to copy a snapshot to another region:

```bash
# Copy an RDS snapshot from us-east-1 to us-west-2
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:my-db-snapshot \
  --target-db-snapshot-identifier my-db-snapshot-copy \
  --source-region us-east-1 \
  --region us-west-2
```

A few things to note here. The `--source-db-snapshot-identifier` needs to be the full ARN when copying across regions - a simple snapshot name won't work. The `--region` flag specifies where the copy ends up.

You can check the status of the copy with this command:

```bash
# Check the status of the snapshot copy in the destination region
aws rds describe-db-snapshots \
  --db-snapshot-identifier my-db-snapshot-copy \
  --region us-west-2 \
  --query 'DBSnapshots[0].Status'
```

It'll return `copying` while in progress and `available` once it's done.

## Handling Encrypted Snapshots

If your RDS instance uses encryption (and it should), copying snapshots across regions requires a bit more setup. KMS keys are region-specific, so you can't use the same key in both regions.

You'll need to specify a KMS key in the destination region:

```bash
# Copy an encrypted snapshot to another region with a destination KMS key
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:my-encrypted-snapshot \
  --target-db-snapshot-identifier my-encrypted-snapshot-copy \
  --source-region us-east-1 \
  --kms-key-id arn:aws:kms:us-west-2:123456789012:key/abcd1234-5678-90ef-ghij-klmnopqrstuv \
  --region us-west-2
```

Make sure the IAM role or user running this command has `kms:CreateGrant` and `kms:DescribeKey` permissions on the destination KMS key.

## Automating Cross-Region Snapshot Copies

Doing this manually every time isn't sustainable. Let's automate it with a Lambda function triggered by an RDS snapshot event.

First, set up an EventBridge rule that fires when an automated snapshot completes:

```json
{
  "source": ["aws.rds"],
  "detail-type": ["RDS DB Snapshot Event"],
  "detail": {
    "EventCategories": ["creation"],
    "SourceType": ["SNAPSHOT"],
    "Message": ["Automated snapshot created"]
  }
}
```

Then create a Lambda function that handles the copy:

```python
import boto3
import os

def lambda_handler(event, context):
    # Extract the snapshot ARN from the event
    source_snapshot_arn = event['detail']['SourceArn']
    target_region = os.environ['TARGET_REGION']
    kms_key_id = os.environ.get('TARGET_KMS_KEY_ID', '')

    # Create an RDS client for the destination region
    target_rds = boto3.client('rds', region_name=target_region)

    # Build the snapshot identifier from the ARN
    snapshot_id = source_snapshot_arn.split(':')[-1]
    target_snapshot_id = f"{snapshot_id}-cross-region"

    # Set up copy parameters
    copy_params = {
        'SourceDBSnapshotIdentifier': source_snapshot_arn,
        'TargetDBSnapshotIdentifier': target_snapshot_id,
        'SourceRegion': os.environ['AWS_REGION'],
    }

    # Add KMS key if provided (for encrypted snapshots)
    if kms_key_id:
        copy_params['KmsKeyId'] = kms_key_id

    # Perform the cross-region copy
    response = target_rds.copy_db_snapshot(**copy_params)

    print(f"Started snapshot copy: {target_snapshot_id} to {target_region}")
    return response['DBSnapshot']['DBSnapshotIdentifier']
```

This function picks up every automated snapshot event and kicks off a copy to your target region. Set the `TARGET_REGION` and `TARGET_KMS_KEY_ID` as environment variables on the Lambda function.

## Cleaning Up Old Cross-Region Snapshots

If you're copying snapshots automatically, they'll pile up fast. Add a cleanup routine that deletes copies older than your retention period:

```python
import boto3
from datetime import datetime, timedelta

def cleanup_old_snapshots(region, retention_days=30):
    rds = boto3.client('rds', region_name=region)
    cutoff = datetime.now(tz=None) - timedelta(days=retention_days)

    # Get all manual snapshots (cross-region copies are stored as manual)
    snapshots = rds.describe_db_snapshots(
        SnapshotType='manual'
    )['DBSnapshots']

    for snap in snapshots:
        # Only delete snapshots that match our naming pattern
        if snap['DBSnapshotIdentifier'].endswith('-cross-region'):
            # Check if the snapshot is older than our cutoff
            snap_time = snap['SnapshotCreateTime'].replace(tzinfo=None)
            if snap_time < cutoff:
                print(f"Deleting old snapshot: {snap['DBSnapshotIdentifier']}")
                rds.delete_db_snapshot(
                    DBSnapshotIdentifier=snap['DBSnapshotIdentifier']
                )
```

## Cost Considerations

Cross-region snapshot copies aren't free. You'll pay for:

- **Data transfer**: AWS charges for data moving between regions. This can add up for large databases.
- **Storage**: The snapshot copy takes up storage in the destination region at standard RDS snapshot rates.

For a 500 GB database, expect around $12-15/month for the snapshot storage in the destination region, plus a one-time transfer cost each time you copy.

## Monitoring Your Snapshot Copies

You'll want to know if a snapshot copy fails. Set up a CloudWatch alarm or use [OneUptime monitoring](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-rds-metrics/view) to track the status of your cross-region copies. You can also use EventBridge to catch copy failure events and send notifications through SNS.

## Common Issues

**Snapshot not found**: Make sure you're using the full ARN for cross-region copies, not just the snapshot name.

**KMS key errors**: Verify the IAM principal has the right KMS permissions in both the source and destination regions.

**Copy taking too long**: Large databases take time. A 1 TB database might take 2-4 hours to copy across regions. There's no way to speed this up.

**Quota limits**: AWS has a default limit of 100 manual snapshots per region. If you're hitting this, request a limit increase or clean up old copies more aggressively.

Cross-region snapshot copies are a foundational piece of any serious disaster recovery plan on AWS. Once you've got the automation in place, it runs quietly in the background and gives you peace of mind that your data is safe even if an entire region goes offline.
