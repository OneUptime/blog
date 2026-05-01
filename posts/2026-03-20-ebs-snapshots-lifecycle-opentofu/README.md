# How to Set Up EBS Snapshots and Lifecycle Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EBS, Snapshot, Data Lifecycle Manager, Backup, Infrastructure as Code

Description: Learn how to create EBS snapshots and configure automated snapshot lifecycle policies using AWS Data Lifecycle Manager and OpenTofu to automate backup and retention.

## Introduction

EBS snapshots are incremental backups stored in S3. AWS Data Lifecycle Manager (DLM) automates snapshot creation and retention, ensuring you always have recovery points without manual intervention. This guide covers both on-demand snapshots and automated lifecycle policies.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2, IAM, and DLM permissions

## Step 1: Create a Manual EBS Snapshot

```hcl
# Create an on-demand snapshot for immediate backup needs

resource "aws_ebs_snapshot" "manual" {
  volume_id   = var.volume_id
  description = "Pre-migration snapshot"

  tags = {
    Name        = "pre-migration-snapshot"
    CreatedBy   = "OpenTofu"
    Purpose     = "Migration"
    Environment = var.environment
  }
}
```

## Step 2: Create an IAM Role for DLM

```hcl
# IAM role that allows DLM to manage EBS snapshots on your behalf
resource "aws_iam_role" "dlm" {
  name = "dlm-lifecycle-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}
```

## Step 3: Create a DLM Lifecycle Policy

```hcl
# Automated snapshot policy with multiple retention schedules
resource "aws_dlm_lifecycle_policy" "database_backup" {
  description        = "Database volume backup policy"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    # Target volumes with the Backup=true tag
    target_tags = {
      Backup = "true"
    }

    # Hourly snapshots retained for 24 hours
    schedule {
      name = "hourly-snapshots"

      create_rule {
        interval      = 1
        interval_unit = "HOURS"
        times         = ["00:00"]  # UTC start time
      }

      retain_rule {
        count = 24  # Keep last 24 hourly snapshots
      }

      tags_to_add = {
        SnapshotType = "Automated"
        Schedule     = "Hourly"
      }

      copy_tags = true
    }

    # Daily snapshots retained for 30 days
    schedule {
      name = "daily-snapshots"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["02:00"]  # 2 AM UTC
      }

      retain_rule {
        count = 30
      }

      tags_to_add = {
        SnapshotType = "Automated"
        Schedule     = "Daily"
      }

      copy_tags = true
    }

    # Weekly snapshots retained for 12 weeks
    schedule {
      name = "weekly-snapshots"

      create_rule {
        cron_expression = "cron(0 3 ? * SUN *)"  # Every Sunday at 3 AM UTC
      }

      retain_rule {
        count = 12
      }

      tags_to_add = {
        SnapshotType = "Automated"
        Schedule     = "Weekly"
      }

      copy_tags = true
    }
  }

  tags = {
    Name = "database-backup-policy"
  }
}
```

## Step 4: Tag Volumes for Automated Backup

```hcl
# Tag EBS volumes to be included in the DLM policy
resource "aws_ebs_volume" "database" {
  availability_zone = var.availability_zone
  type              = "gp3"
  size              = 500
  encrypted         = true

  tags = {
    Name   = "database-volume"
    Backup = "true"  # This tag triggers the DLM policy
  }
}
```

## Step 5: Restore from Snapshot

```hcl
# Restore a volume from a snapshot for recovery testing
resource "aws_ebs_volume" "restored" {
  availability_zone = var.availability_zone
  snapshot_id       = var.recovery_snapshot_id
  type              = "gp3"

  tags = {
    Name    = "restored-database-volume"
    Source  = "snapshot-restore"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

AWS Data Lifecycle Manager automates the complete snapshot lifecycle from creation to deletion, removing the operational burden of manual backup management. The multi-schedule approach provides a flexible recovery point objective (RPO) with hourly, daily, and weekly recovery options. Tag your volumes consistently to ensure all critical storage is protected by the appropriate DLM policy.
