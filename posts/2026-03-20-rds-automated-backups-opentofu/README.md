# How to Set Up RDS Automated Backups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Automated Backup, PITR, Disaster Recovery, Infrastructure as Code

Description: Learn how to configure RDS automated backups, backup windows, and retention periods using OpenTofu to enable point-in-time recovery for your databases.

## Introduction

RDS automated backups enable point-in-time recovery (PITR), allowing you to restore your database to any second within your backup retention window up to the latest restorable time. AWS automatically creates daily snapshots and transaction logs to enable this capability. This is essential for production databases requiring RPO of minutes.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS permissions

## Step 1: Configure Automated Backups on RDS Instance

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.xlarge"

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  # Enable automated backups with a 14-day retention window
  backup_retention_period = 14  # 0 disables automated backups

  # UTC time window for automated snapshots
  # Choose a low-traffic window
  backup_window = "02:00-03:00"  # 2-3 AM UTC

  # UTC maintenance window for OS/engine patching
  maintenance_window = "sun:03:00-sun:04:00"  # After backup completes

  # Copy tags to snapshots for tracking and compliance
  copy_tags_to_snapshot = true

  # Delete automated backups when the instance is deleted
  delete_automated_backups = true

  storage_type      = "gp3"
  allocated_storage = 200
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  tags = {
    Name              = "${var.project_name}-db"
    BackupRetention   = "14-days"
    PITREnabled       = "true"
  }
}
```

## Step 2: Share a Copy of an Automated Backup Across Accounts

```hcl
# Share a copy of the latest automated backup with another account

# Note: Automated snapshots can't be shared directly across accounts.
# Copy the automated snapshot first; the copy becomes a manual snapshot.
# If the snapshot is encrypted, the target account also needs access to the KMS key.

# First, find the latest automated backup
data "aws_db_snapshot" "latest_automated" {
  db_instance_identifier = aws_db_instance.main.identifier
  snapshot_type          = "automated"
  most_recent            = true
}

# Copy the automated snapshot to a manual snapshot and share it
resource "aws_db_snapshot_copy" "dr_share" {
  source_db_snapshot_identifier = data.aws_db_snapshot.latest_automated.db_snapshot_arn
  target_db_snapshot_identifier = "${var.project_name}-dr-${replace(data.aws_db_snapshot.latest_automated.id, ":", "-")}"
  copy_tags                     = true
  shared_accounts               = [var.dr_account_id]
}
```

## Step 3: Restore from Point-in-Time

```bash
# Restore database to a specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier my-project-db \
  --target-db-instance-identifier my-project-db-restored \
  --restore-time 2026-03-19T10:00:00Z \
  --db-subnet-group-name my-subnet-group \
  --vpc-security-group-ids sg-12345678

# Monitor the restore progress
aws rds describe-db-instances \
  --db-instance-identifier my-project-db-restored \
  --query 'DBInstances[0].{Status: DBInstanceStatus, Details: StatusInfos}'
```

## Step 4: Monitor Transaction Log Usage

```hcl
# CloudWatch alarm for PostgreSQL transaction log growth
resource "aws_cloudwatch_metric_alarm" "transaction_logs" {
  alarm_name          = "${var.project_name}-rds-transaction-logs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "TransactionLogsDiskUsage"
  namespace           = "AWS/RDS"
  period              = 3600
  statistic           = "Average"
  threshold           = 10737418240  # 10 GB - alert if logs grow too large

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify backup configuration
aws rds describe-db-instances \
  --db-instance-identifier my-project-db \
  --query 'DBInstances[0].{BackupRetentionPeriod: BackupRetentionPeriod, BackupWindow: PreferredBackupWindow}'
```

## Conclusion

RDS automated backups with 14-day retention provide PITR capability for recovering from data corruption or accidental deletion to a specific point in time within the retention window. Set the backup window to a low-traffic period and ensure the maintenance window starts after the backup window ends to avoid conflicts. For databases with strict RPO requirements, combine automated backups with manual snapshots before major schema changes or deployments.
