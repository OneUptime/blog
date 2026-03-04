# How to Enable RDS Automated Backups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Backups, Disaster Recovery, Database

Description: Learn how to configure RDS automated backups in Terraform including retention policies, backup windows, cross-region backup replication, and point-in-time recovery.

---

Backups are insurance. You hope you never need them, but when you do, nothing else matters. Amazon RDS provides automated backups that include daily snapshots and continuous transaction log archiving, enabling point-in-time recovery to any second within your retention period. Configuring all of this in Terraform means your backup strategy is documented, version-controlled, and consistently applied.

This guide covers automated backups, manual snapshots, cross-region backup replication, and the practical considerations that determine whether your backups will actually save you when something goes wrong.

## How RDS Automated Backups Work

RDS automated backups consist of two components:

1. **Daily snapshots** - full snapshots taken during your configured backup window
2. **Transaction logs** - continuously archived to S3, enabling point-in-time recovery

Together, these allow you to restore to any point within your retention period with up to one-second granularity. The retention period can be 1 to 35 days.

When a backup runs on a single-AZ instance, you may see brief I/O suspension. On Multi-AZ instances, backups are taken from the standby, so the primary is not affected.

## Enabling Automated Backups

Automated backups are controlled by two parameters on the `aws_db_instance` resource:

```hcl
resource "aws_db_instance" "main" {
  identifier = "myapp-db"

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "myapp"
  username = "app_admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # BACKUP CONFIGURATION
  # Retention period in days (1-35, 0 disables automated backups)
  backup_retention_period = 14

  # When to take the daily snapshot (UTC)
  # Choose a low-traffic window for your application
  backup_window = "03:00-04:00"

  # Maintenance window should not overlap with backup window
  maintenance_window = "Sun:04:30-Sun:05:30"

  # Copy all instance tags to snapshots
  copy_tags_to_snapshot = true

  # Final snapshot when instance is deleted
  skip_final_snapshot       = false
  final_snapshot_identifier = "myapp-db-final-${formatdate("YYYY-MM-DD", timestamp())}"

  # Deletion protection
  deletion_protection = true

  tags = {
    Name        = "myapp-db"
    Environment = "production"
    BackupPolicy = "14-day-retention"
  }
}
```

## Choosing the Right Retention Period

The retention period is a balance between cost and recovery options:

```hcl
variable "environment" {
  type = string
}

locals {
  # Different retention periods per environment
  backup_config = {
    production = {
      retention_period = 35    # Maximum retention for production
      backup_window    = "03:00-04:00"
    }
    staging = {
      retention_period = 7     # One week for staging
      backup_window    = "04:00-05:00"
    }
    development = {
      retention_period = 1     # Minimum for dev (0 disables backups entirely)
      backup_window    = "05:00-06:00"
    }
  }
}

resource "aws_db_instance" "main" {
  # ...

  backup_retention_period = local.backup_config[var.environment].retention_period
  backup_window           = local.backup_config[var.environment].backup_window

  # ...
}
```

Setting `backup_retention_period = 0` disables automated backups entirely. Do not do this for any environment where data matters. Even development databases should have at least 1 day of retention.

## Cross-Region Backup Replication

For disaster recovery, you can replicate automated backups to another AWS region. This is a relatively new RDS feature and uses a separate Terraform resource:

```hcl
# Enable automated backup replication to another region
resource "aws_db_instance_automated_backups_replication" "dr" {
  source_db_instance_arn = aws_db_instance.main.arn
  retention_period       = 14  # Can differ from source retention

  # KMS key in the destination region for encrypting replicated backups
  kms_key_id = var.dr_region_kms_key_arn

  # This resource is created in the DESTINATION region
  # Use a provider alias for the DR region
  provider = aws.dr_region
}

# Provider for the DR region
provider "aws" {
  alias  = "dr_region"
  region = "eu-west-1"
}
```

With cross-region backup replication, you can restore your database in a different region if the primary region has an outage.

## Manual Snapshots

Automated backups are great, but manual snapshots are useful for specific events like before a major migration or deployment:

```hcl
# Manual snapshot before a risky operation
resource "aws_db_snapshot" "pre_migration" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_snapshot_identifier = "pre-migration-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name    = "pre-migration-snapshot"
    Purpose = "Taken before schema migration"
  }
}
```

Manual snapshots persist until you explicitly delete them - they are not subject to the retention period. This is both a feature and a cost consideration.

## Snapshot Copy for Long-Term Archival

For long-term retention beyond the 35-day maximum, copy snapshots and manage their lifecycle:

```hcl
# Copy the latest automated snapshot for long-term storage
resource "aws_db_snapshot_copy" "monthly_archive" {
  source_db_snapshot_identifier = aws_db_instance.main.id
  target_db_snapshot_identifier = "monthly-archive-${formatdate("YYYY-MM", timestamp())}"
  copy_tags                     = true
  kms_key_id                    = var.archive_kms_key_arn

  tags = {
    Name         = "monthly-archive"
    RetainUntil  = formatdate("YYYY-MM-DD", timeadd(timestamp(), "8760h"))
    ArchiveType  = "monthly"
  }
}
```

## Monitoring Backup Status

Set up CloudWatch alarms to catch backup failures:

```hcl
# SNS topic for backup alerts
resource "aws_sns_topic" "backup_alerts" {
  name = "rds-backup-alerts"
}

# EventBridge rule to catch backup events
resource "aws_cloudwatch_event_rule" "rds_backup_events" {
  name        = "rds-backup-events"
  description = "Capture RDS backup completion and failure events"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail-type = ["RDS DB Instance Event"]
    detail = {
      EventCategories = ["backup"]
      SourceArn       = [aws_db_instance.main.arn]
    }
  })
}

resource "aws_cloudwatch_event_target" "backup_sns" {
  rule      = aws_cloudwatch_event_rule.rds_backup_events.name
  target_id = "backup-notifications"
  arn       = aws_sns_topic.backup_alerts.arn
}

# Also monitor free storage space - running out breaks backups
resource "aws_cloudwatch_metric_alarm" "free_storage" {
  alarm_name          = "rds-free-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10GB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_description = "RDS free storage is below 10GB"
  alarm_actions     = [aws_sns_topic.backup_alerts.arn]
}
```

## Point-in-Time Recovery

Point-in-time recovery (PITR) is the primary reason automated backups are so valuable. You cannot trigger PITR from Terraform directly - it is an operational action done through the console or CLI:

```bash
# Restore to a specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-restored \
  --restore-time "2026-02-23T10:30:00Z" \
  --db-instance-class db.r6g.large \
  --db-subnet-group-name myapp-db-subnets

# Or restore to the latest restorable time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-restored \
  --use-latest-restorable-time
```

After restoring, you will need to import the new instance into Terraform or manage it manually.

## Backup Cost Considerations

Automated backup storage up to 100% of your allocated storage is free. Beyond that, you pay per GB-month. Manual snapshots always incur storage costs.

Cross-region backup replication adds data transfer costs and storage costs in the destination region.

For a production database with 100GB of allocated storage and 14-day retention, expect the automated backup storage to be roughly 100-200GB depending on your change rate. That is usually well within the free allocation.

## Testing Your Backups

Backups that have not been tested are not real backups. Periodically restore from backup and verify the data:

```bash
# Restore from the latest automated backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier myapp-db \
  --target-db-instance-identifier myapp-db-backup-test \
  --use-latest-restorable-time \
  --db-instance-class db.t3.medium \
  --no-multi-az

# Wait for it to become available, then verify
# Connect and run some queries to validate data integrity

# Clean up when done
aws rds delete-db-instance \
  --db-instance-identifier myapp-db-backup-test \
  --skip-final-snapshot
```

## Summary

RDS automated backups in Terraform boil down to setting `backup_retention_period` and `backup_window` on your instance. But a complete backup strategy includes cross-region replication for disaster recovery, monitoring for backup failures, periodic manual snapshots before risky operations, and - most importantly - regular testing of your restore process. All of these can be managed through Terraform, giving you a documented and repeatable backup strategy.
