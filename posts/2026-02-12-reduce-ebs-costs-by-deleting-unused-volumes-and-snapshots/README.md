# How to Reduce EBS Costs by Deleting Unused Volumes and Snapshots

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EBS, Cost Optimization, Storage

Description: A guide to finding and cleaning up unused EBS volumes and snapshots that are quietly adding to your AWS bill every month.

---

Here's a scenario that plays out in nearly every AWS account: someone launches an EC2 instance for testing, terminates it a week later, and the EBS volume sticks around. Multiply that by a few dozen engineers over a couple of years, and you end up with hundreds of orphaned volumes and thousands of stale snapshots, all silently charging you every month.

EBS volumes cost between $0.08/GB and $0.125/GB per month depending on the type. Snapshots cost $0.05/GB per month. A single forgotten 500GB gp3 volume costs $40/month. Ten of them cost $400/month. It adds up, and nobody notices because the charges blend into the overall storage line item.

Let's find and clean up this waste.

## Finding Unattached EBS Volumes

An unattached volume is one that isn't connected to any EC2 instance. These are almost always candidates for deletion.

```bash
# Find all unattached (available) EBS volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query "Volumes[].{
    VolumeId: VolumeId,
    Size: Size,
    Type: VolumeType,
    Created: CreateTime,
    AZ: AvailabilityZone
  }" \
  --output table
```

To understand the total cost impact:

```bash
# Calculate total size and estimated monthly cost of unattached volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query "Volumes[].{Size: Size, Type: VolumeType}" \
  --output json | python3 -c "
import json, sys

pricing = {
    'gp2': 0.10, 'gp3': 0.08, 'io1': 0.125,
    'io2': 0.125, 'st1': 0.045, 'sc1': 0.015,
    'standard': 0.05
}

volumes = json.load(sys.stdin)
total_cost = 0
total_size = 0

for v in volumes:
    cost = v['Size'] * pricing.get(v['Type'], 0.10)
    total_cost += cost
    total_size += v['Size']

print(f'Unattached volumes: {len(volumes)}')
print(f'Total size: {total_size} GB')
print(f'Estimated monthly cost: \${total_cost:.2f}')
"
```

## Finding Old Snapshots

Snapshots accumulate even faster than volumes. Automated backup tools, AMI creation, and manual snapshots all pile up over time.

```bash
# Find snapshots older than 90 days owned by your account
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime<='2025-11-12T00:00:00'].{
    SnapshotId: SnapshotId,
    VolumeId: VolumeId,
    Size: VolumeSize,
    Started: StartTime,
    Description: Description
  }" \
  --output table
```

For a cost summary of snapshots:

```bash
# Calculate total snapshot storage and cost
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "length(Snapshots)" \
  --output text

aws ec2 describe-snapshots \
  --owner-ids self \
  --query "sum(Snapshots[].VolumeSize)" \
  --output text
```

Keep in mind that snapshot pricing is based on incremental storage, not the full volume size. But the VolumeSize gives you a rough upper bound.

## Safe Deletion Workflow

Don't just delete everything blindly. Here's a safe process.

**Step 1: Tag volumes for review.** Add a tag to flag unattached volumes instead of deleting immediately:

```bash
# Tag all unattached volumes for review
for vol_id in $(aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query "Volumes[].VolumeId" \
  --output text); do

  aws ec2 create-tags \
    --resources $vol_id \
    --tags Key=ReviewStatus,Value=PendingDeletion Key=ReviewDate,Value=$(date +%Y-%m-%d)
  echo "Tagged $vol_id for review"
done
```

**Step 2: Notify owners.** If volumes have tags indicating who created them, send notifications. If not, this is a good reminder to enforce tagging policies.

**Step 3: Snapshot before deleting.** For volumes you're unsure about, take a snapshot first. Snapshots are cheaper than volumes:

```bash
# Create a snapshot of a volume before deleting it
aws ec2 create-snapshot \
  --volume-id vol-0a1b2c3d4e5f67890 \
  --description "Pre-deletion backup - $(date +%Y-%m-%d)" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Purpose,Value=pre-deletion-backup}]'
```

**Step 4: Delete after waiting period.** After a week or two with no one claiming the volume:

```bash
# Delete a specific unattached volume
aws ec2 delete-volume --volume-id vol-0a1b2c3d4e5f67890

# Bulk delete all volumes tagged PendingDeletion and older than 14 days
for vol_id in $(aws ec2 describe-volumes \
  --filters Name=tag:ReviewStatus,Values=PendingDeletion Name=status,Values=available \
  --query "Volumes[].VolumeId" \
  --output text); do

  aws ec2 delete-volume --volume-id $vol_id
  echo "Deleted $vol_id"
done
```

## Automated Cleanup with Lambda

Set up a Lambda function that runs weekly to identify and tag orphaned volumes:

```python
import boto3
from datetime import datetime, timedelta

ec2 = boto3.client('ec2')
sns = boto3.client('sns')

NOTIFICATION_TOPIC = 'arn:aws:sns:us-east-1:123456789012:ebs-cleanup'
GRACE_PERIOD_DAYS = 14

def lambda_handler(event, context):
    # Find all unattached volumes
    response = ec2.describe_volumes(
        Filters=[{'Name': 'status', 'Values': ['available']}]
    )

    volumes_to_review = []
    volumes_to_delete = []

    for volume in response['Volumes']:
        vol_id = volume['VolumeId']
        tags = {t['Key']: t['Value'] for t in volume.get('Tags', [])}

        if 'ReviewDate' in tags:
            # Already tagged - check if grace period has passed
            review_date = datetime.strptime(tags['ReviewDate'], '%Y-%m-%d')
            if (datetime.now() - review_date).days >= GRACE_PERIOD_DAYS:
                volumes_to_delete.append({
                    'id': vol_id,
                    'size': volume['Size'],
                    'type': volume['VolumeType']
                })
        else:
            # New orphan - tag it for review
            ec2.create_tags(
                Resources=[vol_id],
                Tags=[
                    {'Key': 'ReviewStatus', 'Value': 'PendingDeletion'},
                    {'Key': 'ReviewDate', 'Value': datetime.now().strftime('%Y-%m-%d')}
                ]
            )
            volumes_to_review.append({
                'id': vol_id,
                'size': volume['Size'],
                'type': volume['VolumeType']
            })

    # Send notification
    if volumes_to_review or volumes_to_delete:
        message = f"EBS Cleanup Report\n\n"
        message += f"New orphaned volumes tagged for review: {len(volumes_to_review)}\n"
        message += f"Volumes past grace period (ready to delete): {len(volumes_to_delete)}\n\n"

        if volumes_to_delete:
            message += "Volumes ready for deletion:\n"
            for v in volumes_to_delete:
                message += f"  - {v['id']} ({v['size']}GB {v['type']})\n"

        sns.publish(
            TopicArn=NOTIFICATION_TOPIC,
            Subject='EBS Cleanup Report',
            Message=message
        )

    return {
        'tagged_for_review': len(volumes_to_review),
        'ready_to_delete': len(volumes_to_delete)
    }
```

Schedule it with EventBridge:

```bash
# Create a weekly schedule for the cleanup Lambda
aws events put-rule \
  --name "weekly-ebs-cleanup" \
  --schedule-expression "rate(7 days)" \
  --description "Weekly scan for unused EBS volumes"

aws events put-targets \
  --rule weekly-ebs-cleanup \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:ebs-cleanup"
```

## Snapshot Lifecycle Management

Use Amazon Data Lifecycle Manager (DLM) to automatically manage snapshot retention:

```bash
# Create a DLM policy to keep snapshots for 30 days
aws dlm create-lifecycle-policy \
  --description "Delete snapshots older than 30 days" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/dlm-role \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "Backup", "Value": "true"}],
    "Schedules": [
      {
        "Name": "DailySnapshots",
        "CreateRule": {"Interval": 24, "IntervalUnit": "HOURS"},
        "RetainRule": {"Count": 30},
        "CopyTags": true
      }
    ]
  }'
```

For snapshots that aren't managed by DLM, clean them up manually:

```bash
# Delete snapshots older than 90 days that match a specific pattern
aws ec2 describe-snapshots \
  --owner-ids self \
  --query "Snapshots[?StartTime<='2025-11-12T00:00:00'].SnapshotId" \
  --output text | tr '\t' '\n' | while read snap_id; do
  echo "Deleting $snap_id"
  aws ec2 delete-snapshot --snapshot-id $snap_id
done
```

## Prevention: Stop the Problem at the Source

Cleaning up is good, but preventing waste in the first place is better.

**Set EC2 termination protection for EBS volumes.** By default, root volumes are deleted on instance termination, but additional volumes aren't. Fix this:

```bash
# When launching an instance, set all volumes to delete on termination
aws ec2 run-instances \
  --image-id ami-0a1b2c3d4e5f67890 \
  --instance-type t3.medium \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/xvda",
      "Ebs": {"DeleteOnTermination": true, "VolumeSize": 20, "VolumeType": "gp3"}
    },
    {
      "DeviceName": "/dev/xvdb",
      "Ebs": {"DeleteOnTermination": true, "VolumeSize": 100, "VolumeType": "gp3"}
    }
  ]'
```

**Enforce tagging with AWS Config or SCP.** Require tags like Owner and Environment on all EBS volumes so you can track who's responsible.

For a broader look at finding waste in your AWS account, check out our guide on [identifying idle and unused AWS resources](https://oneuptime.com/blog/post/identify-idle-and-unused-aws-resources/view).

## Bottom Line

Unused EBS volumes and stale snapshots are pure waste. Most AWS accounts have hundreds of dollars per month in orphaned storage that nobody's using. The cleanup process is straightforward: find them, tag them, wait a grace period, snapshot if needed, and delete. Then set up automation so they don't accumulate again. It's one of the easiest wins in AWS cost optimization.
