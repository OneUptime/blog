# How to Configure DynamoDB Backup and PITR with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Backup, PITR, Disaster Recovery, Infrastructure as Code

Description: Learn how to enable DynamoDB point-in-time recovery and configure AWS Backup for DynamoDB tables using OpenTofu for comprehensive data protection.

## Introduction

DynamoDB offers two backup mechanisms: Point-in-Time Recovery (PITR), which enables continuous backups with second-level granularity for up to 35 days, and AWS Backup for scheduled or on-demand backups with long-term retention. Both are fully managed with no performance impact on the table.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB and AWS Backup permissions
- If you plan to transition DynamoDB backups to cold storage, ensure AWS Backup advanced DynamoDB backup features are enabled in the target AWS Region

## Step 1: Enable PITR on DynamoDB Table

```hcl
resource "aws_dynamodb_table" "main" {
  name         = "${var.project_name}-main"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Enable point-in-time recovery
  # Allows restore to any second within the configured recovery period
  # 35 days is the default and maximum retention period
  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  tags = {
    Name        = "${var.project_name}-main"
    Environment = var.environment
    Backup      = "enabled"
  }
}
```

## Step 2: Configure AWS Backup for DynamoDB

```hcl
# IAM role for AWS Backup

resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backup_dynamodb" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# Backup vault for DynamoDB backups
resource "aws_backup_vault" "dynamodb" {
  name        = "${var.project_name}-dynamodb-backup-vault"
  kms_key_arn = var.kms_key_arn

  tags = {
    Name = "${var.project_name}-dynamodb-backup-vault"
  }
}

# Backup plan with multiple schedules
resource "aws_backup_plan" "dynamodb" {
  name = "${var.project_name}-dynamodb-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.dynamodb.name
    schedule          = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC

    lifecycle {
      delete_after = 35  # Retain for 35 days
    }
  }

  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.dynamodb.name
    schedule          = "cron(0 3 1 * ? *)"  # First day of each month

    lifecycle {
      cold_storage_after                      = 30    # Move to cold storage after 30 days
      opt_in_to_archive_for_supported_resources = true
      delete_after                            = 365   # Retain for 1 year
    }
  }
}

# Select DynamoDB tables to back up using tags
resource "aws_backup_selection" "dynamodb" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-dynamodb-selection"
  plan_id      = aws_backup_plan.dynamodb.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "enabled"
  }
}
```

## Step 3: Restore from PITR (CLI)

```bash
# Restore table to a specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name my-project-main \
  --target-table-name my-project-main-restored \
  --restore-date-time 2026-03-19T10:00:00Z

# Monitor restore progress
aws dynamodb describe-table \
  --table-name my-project-main-restored \
  --query 'Table.{Status: TableStatus, Progress: RestoreSummary}'
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify PITR is enabled
aws dynamodb describe-continuous-backups \
  --table-name my-project-main
```

## Conclusion

Enable PITR on all production DynamoDB tables-it has no performance impact and protects against accidental data deletion or corruption with second-level recovery granularity. Supplement PITR with AWS Backup for long-term retention beyond 35 days and for compliance requirements that mandate immutable backup storage when combined with AWS Backup Vault Lock. Tag all tables with `Backup = enabled` to automatically include them in backup plans without per-table configuration.
