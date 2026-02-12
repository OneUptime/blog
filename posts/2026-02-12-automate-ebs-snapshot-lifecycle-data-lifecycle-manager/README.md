# How to Automate EBS Snapshot Lifecycle with Data Lifecycle Manager

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EBS, Snapshots, Automation

Description: Learn how to use AWS Data Lifecycle Manager to automate EBS snapshot creation, retention, and cross-region copying for consistent backup management.

---

Taking EBS snapshots manually is tedious, and forgetting to do it is dangerous. Even if you've set up a cron job or Lambda function to create snapshots, you still need to handle retention and cleanup. Orphaned snapshots pile up and cost money. AWS Data Lifecycle Manager (DLM) solves all of this with automated policies that handle the entire snapshot lifecycle - creation, retention, and deletion.

## What Data Lifecycle Manager Does

DLM is a purpose-built service for managing the lifecycle of EBS snapshots and EBS-backed AMIs. You define policies that specify:

- Which volumes or instances to snapshot (selected by tags)
- How often to take snapshots
- How many snapshots to retain
- Whether to copy snapshots to other regions
- Whether to enable fast snapshot restore

It's simpler than AWS Backup for pure EBS snapshot management, and it's completely free - you only pay for the snapshot storage itself.

## Creating Your First Lifecycle Policy

Let's create a policy that takes daily snapshots of volumes tagged for backup.

First, tag the EBS volumes you want to back up:

```bash
# Tag EBS volumes for automated snapshots
aws ec2 create-tags \
  --resources vol-0abc123 vol-0def456 \
  --tags Key=DLMBackup,Value=true
```

Create an IAM role for DLM:

```bash
# Create the DLM service role
aws iam create-role \
  --role-name AWSDataLifecycleManagerDefaultRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "dlm.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the managed policy
aws iam attach-role-policy \
  --role-name AWSDataLifecycleManagerDefaultRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole
```

Now create the lifecycle policy:

```bash
# Create a daily snapshot policy
aws dlm create-lifecycle-policy \
  --description "Daily snapshots with 7-day retention" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "DLMBackup", "Value": "true"}],
    "Schedules": [{
      "Name": "DailySnapshots",
      "CreateRule": {
        "Interval": 24,
        "IntervalUnit": "HOURS",
        "Times": ["03:00"]
      },
      "RetainRule": {
        "Count": 7
      },
      "TagsToAdd": [
        {"Key": "CreatedBy", "Value": "DLM"},
        {"Key": "Type", "Value": "daily-snapshot"}
      ],
      "CopyTags": true
    }]
  }'
```

This policy creates a snapshot of every volume tagged `DLMBackup=true` at 3:00 AM UTC daily, keeps the 7 most recent snapshots, and automatically deletes older ones.

## Multiple Schedules in One Policy

You often need different retention periods - daily snapshots for a week, weekly for a month, and monthly for a year.

Create a policy with multiple schedules:

```bash
aws dlm create-lifecycle-policy \
  --description "Multi-tier snapshot retention" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "DLMBackup", "Value": "true"}],
    "Schedules": [
      {
        "Name": "DailySnapshots",
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS",
          "Times": ["03:00"]
        },
        "RetainRule": {
          "Count": 7
        },
        "TagsToAdd": [{"Key": "Frequency", "Value": "daily"}],
        "CopyTags": true
      },
      {
        "Name": "WeeklySnapshots",
        "CreateRule": {
          "CronExpression": "cron(0 3 ? * SUN *)"
        },
        "RetainRule": {
          "Count": 4
        },
        "TagsToAdd": [{"Key": "Frequency", "Value": "weekly"}],
        "CopyTags": true
      },
      {
        "Name": "MonthlySnapshots",
        "CreateRule": {
          "CronExpression": "cron(0 3 1 * ? *)"
        },
        "RetainRule": {
          "Count": 12
        },
        "TagsToAdd": [{"Key": "Frequency", "Value": "monthly"}],
        "CopyTags": true
      }
    ]
  }'
```

## Instance-Level Snapshots

Instead of targeting individual volumes, you can snapshot all volumes attached to tagged instances. This is especially useful because it captures the complete state of the instance.

Create an instance-level snapshot policy:

```bash
# Tag instances for backup
aws ec2 create-tags \
  --resources i-0abc123 i-0def456 \
  --tags Key=DLMBackup,Value=true

# Create policy targeting instances
aws dlm create-lifecycle-policy \
  --description "Instance-level daily snapshots" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["INSTANCE"],
    "TargetTags": [{"Key": "DLMBackup", "Value": "true"}],
    "Schedules": [{
      "Name": "DailyInstanceSnapshots",
      "CreateRule": {
        "Interval": 24,
        "IntervalUnit": "HOURS",
        "Times": ["03:00"]
      },
      "RetainRule": {
        "Count": 14
      },
      "CopyTags": true
    }]
  }'
```

This will snapshot all EBS volumes attached to each tagged instance, not just the root volume.

## Cross-Region Snapshot Copies

For disaster recovery, automatically copy snapshots to another region.

Add cross-region copy to your policy:

```bash
aws dlm create-lifecycle-policy \
  --description "Daily snapshots with DR copy" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "DLMBackup", "Value": "true"}],
    "Schedules": [{
      "Name": "DailyWithDR",
      "CreateRule": {
        "Interval": 24,
        "IntervalUnit": "HOURS",
        "Times": ["03:00"]
      },
      "RetainRule": {
        "Count": 7
      },
      "CrossRegionCopyRules": [{
        "TargetRegion": "us-west-2",
        "Encrypted": true,
        "RetainRule": {
          "Interval": 7,
          "IntervalUnit": "DAYS"
        }
      }],
      "CopyTags": true
    }]
  }'
```

## Managing Policies

Check existing policies and their status:

```bash
# List all lifecycle policies
aws dlm get-lifecycle-policies \
  --query 'Policies[].{ID: PolicyId, Description: Description, State: State}' \
  --output table

# Get details of a specific policy
aws dlm get-lifecycle-policy --policy-id policy-0abc123

# Disable a policy (without deleting)
aws dlm update-lifecycle-policy \
  --policy-id policy-0abc123 \
  --state DISABLED

# Delete a policy (existing snapshots are NOT deleted)
aws dlm delete-lifecycle-policy --policy-id policy-0abc123
```

## Terraform Configuration

Here's the DLM setup as Terraform code:

```hcl
# IAM role for DLM
resource "aws_iam_role" "dlm" {
  name = "dlm-lifecycle-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

# DLM Lifecycle Policy
resource "aws_dlm_lifecycle_policy" "daily_snapshots" {
  description        = "Daily EBS snapshots"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      DLMBackup = "true"
    }

    schedule {
      name = "Daily snapshots"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["03:00"]
      }

      retain_rule {
        count = 7
      }

      tags_to_add = {
        CreatedBy = "DLM"
      }

      copy_tags = true
    }

    schedule {
      name = "Weekly snapshots"

      create_rule {
        cron_expression = "cron(0 3 ? * SUN *)"
      }

      retain_rule {
        count = 4
      }

      copy_tags = true
    }
  }
}
```

## Cost Considerations

EBS snapshots are incremental, so each snapshot only stores the blocks that changed since the last one. But they still add up.

Estimate your snapshot costs:

```bash
# List all DLM-created snapshots and their sizes
aws ec2 describe-snapshots \
  --filters "Name=tag:CreatedBy,Values=DLM" \
  --query 'Snapshots[].{ID: SnapshotId, Size: VolumeSize, Date: StartTime}' \
  --output table

# Total snapshot storage in use
aws ec2 describe-snapshots \
  --owner-ids self \
  --query 'sum(Snapshots[].VolumeSize)' \
  --output text
```

Snapshot pricing is roughly $0.05 per GB-month. A 100 GB volume with 7 daily snapshots doesn't cost 7x100 GB - thanks to incremental storage, it's usually much less.

## Fast Snapshot Restore

If you need to restore from snapshots quickly (avoiding the lazy-loading performance penalty when you first access a restored volume), enable Fast Snapshot Restore:

```bash
# Enable FSR for specific snapshots in an AZ
aws ec2 enable-fast-snapshot-restores \
  --availability-zones us-east-1a \
  --source-snapshot-ids snap-0abc123
```

Note that FSR has an additional hourly charge per snapshot per AZ, so use it selectively for critical volumes only.

## DLM vs AWS Backup

Both services handle EBS snapshots, so when should you use which?

| Feature | DLM | AWS Backup |
|---------|-----|-----------|
| Cost | Free (pay for snapshots only) | Free (pay for storage only) |
| EBS snapshots | Yes | Yes |
| EC2 AMIs | Yes | Yes |
| Other services (RDS, S3, etc.) | No | Yes |
| Compliance reporting | No | Yes |
| Cross-account backup | No | Yes |
| Vault lock (WORM) | No | Yes |

Use DLM when you only need EBS snapshot management. Use AWS Backup when you need a unified backup solution across multiple AWS services, or when you need compliance features.

For more on AWS Backup, check out our post on [backing up EC2 instances with AWS Backup](https://oneuptime.com/blog/post/back-up-ec2-aws-backup/view).

For monitoring your backup health and snapshot status, see our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

Data Lifecycle Manager automates the tedious parts of EBS snapshot management - creating snapshots on schedule, enforcing retention policies, and cleaning up old snapshots. Set up your policies once, tag your resources, and let DLM handle the rest. It's free to use, so there's really no reason not to have automated snapshots on every important volume.
