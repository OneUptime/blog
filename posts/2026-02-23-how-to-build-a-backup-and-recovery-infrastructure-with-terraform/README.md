# How to Build a Backup and Recovery Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Backups, Disaster Recovery, AWS, Cloud Infrastructure

Description: Learn how to build a production-grade backup and recovery infrastructure using Terraform with automated snapshots, cross-region replication, and recovery testing.

---

Losing data is one of the worst things that can happen to any organization. Whether it is accidental deletion, ransomware, or a region-wide outage, having a solid backup and recovery infrastructure is not optional. It is a requirement. In this post, we will walk through building a comprehensive backup and recovery setup using Terraform, covering automated snapshots, cross-region replication, and recovery validation.

## Why Terraform for Backup Infrastructure?

Managing backups manually is error-prone. Someone forgets to set up a backup policy for a new database. Another person misconfigures a retention period. Terraform eliminates these problems by letting you define your entire backup strategy as code. You get version control, peer review, and reproducibility. When your backup infrastructure is defined in Terraform, every new resource automatically gets the backup treatment it deserves.

## Architecture Overview

Our backup infrastructure will include:

- AWS Backup for centralized backup management
- Cross-region replication for disaster recovery
- S3 versioning and lifecycle policies for object storage
- RDS automated snapshots with cross-region copies
- EBS snapshot automation
- Recovery testing with scheduled restores

## Setting Up the AWS Backup Vault

The first step is creating a backup vault with encryption. This is where all your backup data lives.

```hcl
# Primary backup vault with KMS encryption
resource "aws_kms_key" "backup_key" {
  description             = "KMS key for backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Purpose = "backup-encryption"
  }
}

resource "aws_backup_vault" "primary" {
  name        = "primary-backup-vault"
  kms_key_arn = aws_kms_key.backup_key.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Secondary vault in another region for DR
resource "aws_backup_vault" "dr_vault" {
  provider    = aws.dr_region
  name        = "dr-backup-vault"
  kms_key_arn = aws_kms_key.dr_backup_key.arn

  tags = {
    Environment = "production"
    Purpose     = "disaster-recovery"
  }
}
```

## Defining Backup Plans

AWS Backup lets you define backup plans that specify when and how often backups occur. Here we create a plan with daily, weekly, and monthly schedules.

```hcl
# Comprehensive backup plan with multiple schedules
resource "aws_backup_plan" "production" {
  name = "production-backup-plan"

  # Daily backups - keep for 35 days
  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 3 * * ? *)"  # 3 AM UTC daily
    start_window      = 60   # minutes
    completion_window = 180  # minutes

    lifecycle {
      delete_after = 35
    }

    # Copy to DR region
    copy_action {
      destination_vault_arn = aws_backup_vault.dr_vault.arn
      lifecycle {
        delete_after = 35
      }
    }
  }

  # Weekly backups - keep for 90 days
  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 4 ? * SUN *)"  # Sunday 4 AM UTC
    start_window      = 60
    completion_window = 360

    lifecycle {
      delete_after = 90
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_vault.arn
      lifecycle {
        delete_after = 90
      }
    }
  }

  # Monthly backups - keep for 365 days
  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 5 1 * ? *)"  # 1st of month, 5 AM UTC
    start_window      = 60
    completion_window = 720

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_vault.arn
      lifecycle {
        cold_storage_after = 30
        delete_after       = 365
      }
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Resource Selection with Tags

Rather than listing every resource individually, use tag-based selection so new resources automatically get backed up.

```hcl
# IAM role for AWS Backup
resource "aws_iam_role" "backup_role" {
  name = "aws-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "restore_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Select resources by tag - anything tagged with Backup=true gets backed up
resource "aws_backup_selection" "production_resources" {
  name         = "production-resources"
  iam_role_arn = aws_iam_role.backup_role.arn
  plan_id      = aws_backup_plan.production.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
}
```

## S3 Backup with Versioning and Replication

For S3 buckets, you need versioning and cross-region replication rather than traditional backups.

```hcl
# Source bucket with versioning
resource "aws_s3_bucket" "data" {
  bucket = "myapp-production-data"

  tags = {
    Backup = "true"
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules to manage old versions
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "move-old-versions"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# DR bucket in another region
resource "aws_s3_bucket" "data_replica" {
  provider = aws.dr_region
  bucket   = "myapp-production-data-replica"
}

resource "aws_s3_bucket_versioning" "data_replica" {
  provider = aws.dr_region
  bucket   = aws_s3_bucket.data_replica.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Cross-region replication
resource "aws_s3_bucket_replication_configuration" "data" {
  depends_on = [aws_s3_bucket_versioning.data]
  role       = aws_iam_role.replication_role.arn
  bucket     = aws_s3_bucket.data.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.data_replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## RDS Backup Configuration

For databases, you want both automated snapshots and manual snapshot copies to another region.

```hcl
# RDS instance with backup configuration
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  # Backup configuration
  backup_retention_period   = 35
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  deletion_protection       = true

  # Storage encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.backup_key.arn

  tags = {
    Backup      = "true"
    Environment = "production"
  }
}

# Lambda function to copy snapshots cross-region (triggered by EventBridge)
resource "aws_lambda_function" "snapshot_copier" {
  filename         = "snapshot_copier.zip"
  function_name    = "rds-snapshot-copier"
  role             = aws_iam_role.snapshot_copier_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      DR_REGION       = "us-west-2"
      KMS_KEY_ID      = aws_kms_key.dr_backup_key.arn
      RETENTION_DAYS  = "35"
    }
  }
}

# EventBridge rule to trigger on RDS snapshot completion
resource "aws_cloudwatch_event_rule" "snapshot_created" {
  name = "rds-snapshot-created"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail-type = ["RDS DB Snapshot Event"]
    detail = {
      EventID = ["RDS-EVENT-0091"]
    }
  })
}
```

## Monitoring Backup Health

Backups that you never verify are not really backups. Set up monitoring to catch failures early.

```hcl
# SNS topic for backup alerts
resource "aws_sns_topic" "backup_alerts" {
  name = "backup-failure-alerts"
}

resource "aws_sns_topic_subscription" "ops_team" {
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = "ops-team@company.com"
}

# CloudWatch alarm for backup job failures
resource "aws_cloudwatch_metric_alarm" "backup_failures" {
  alarm_name          = "backup-job-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 86400  # 24 hours
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when any backup job fails"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]

  dimensions = {
    BackupVaultName = aws_backup_vault.primary.name
  }
}

# EventBridge rule for backup job state changes
resource "aws_cloudwatch_event_rule" "backup_state_change" {
  name = "backup-job-state-change"

  event_pattern = jsonencode({
    source      = ["aws.backup"]
    detail-type = ["Backup Job State Change"]
    detail = {
      state = ["FAILED", "EXPIRED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "backup_alert" {
  rule      = aws_cloudwatch_event_rule.backup_state_change.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.backup_alerts.arn
}
```

## Vault Lock for Immutable Backups

To protect against ransomware and accidental deletion, use vault lock to make backups immutable.

```hcl
# Vault lock prevents anyone from deleting backups during the retention period
resource "aws_backup_vault_lock_configuration" "primary" {
  backup_vault_name   = aws_backup_vault.primary.name
  min_retention_days  = 7
  max_retention_days  = 365
  changeable_for_days = 3  # Grace period to remove the lock
}
```

## Recovery Testing

The final piece is making sure your backups actually work. Schedule regular restore tests.

```hcl
# Lambda function that performs monthly restore tests
resource "aws_lambda_function" "restore_tester" {
  filename         = "restore_tester.zip"
  function_name    = "backup-restore-tester"
  role             = aws_iam_role.restore_tester_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 900

  environment {
    variables = {
      BACKUP_VAULT  = aws_backup_vault.primary.name
      SUBNET_ID     = var.test_subnet_id
      SG_ID         = var.test_security_group_id
      SNS_TOPIC_ARN = aws_sns_topic.backup_alerts.arn
    }
  }
}

# Monthly schedule for restore testing
resource "aws_cloudwatch_event_rule" "monthly_restore_test" {
  name                = "monthly-restore-test"
  schedule_expression = "cron(0 6 1 * ? *)"  # 1st of each month at 6 AM
}

resource "aws_cloudwatch_event_target" "restore_test" {
  rule      = aws_cloudwatch_event_rule.monthly_restore_test.name
  target_id = "trigger-restore-test"
  arn       = aws_lambda_function.restore_tester.arn
}
```

## Putting It All Together

When you combine all these pieces, you end up with a backup infrastructure that covers every layer of your stack. Databases get automated snapshots with cross-region copies. S3 data gets versioned and replicated. EC2 volumes get regular EBS snapshots. Everything is encrypted, monitored, and regularly tested.

The key principles to remember are: automate everything so nothing gets missed, replicate across regions for true disaster recovery, monitor failures aggressively, and test your restores regularly. A backup you have never restored is just a hope, not a plan.

For monitoring your backup infrastructure health and getting alerted when recovery jobs fail, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-backup-and-recovery-infrastructure-with-terraform/view) for unified observability across your cloud resources.
