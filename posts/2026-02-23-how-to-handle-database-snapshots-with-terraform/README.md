# How to Handle Database Snapshots with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Snapshots, Backups, RDS, Infrastructure as Code

Description: Learn how to manage database snapshots with Terraform including creating manual snapshots, configuring automated backups, and managing snapshot lifecycle.

---

Database snapshots are a critical part of any disaster recovery strategy. They capture the state of your database at a specific point in time and allow you to restore your data if something goes wrong. AWS provides several ways to manage snapshots for its database services, and Terraform gives you a powerful way to define and manage these snapshot configurations as code. In this guide, we will cover how to handle database snapshots across different AWS database services using Terraform.

## Understanding Database Snapshots

A database snapshot is a storage-level backup of your database instance. For RDS and Aurora, snapshots capture the entire DB instance, including all databases on that instance. Snapshots are stored in Amazon S3 and are incremental, meaning that after the first full snapshot, subsequent snapshots only capture the data that has changed.

There are two types of snapshots: automated snapshots that AWS creates according to your backup retention settings, and manual snapshots that you create explicitly. Automated snapshots are deleted when the retention period expires or when the DB instance is deleted. Manual snapshots persist until you explicitly delete them.

## Setting Up the Provider

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Configuring Automated Snapshots for RDS

Automated snapshots are configured directly on the RDS instance through the backup retention period:

```hcl
# RDS instance with automated snapshots configured
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  db_name  = "appdb"
  username = "dbadmin"
  password = var.db_password

  # Backup configuration
  backup_retention_period = 7              # Keep automated snapshots for 7 days
  backup_window           = "02:00-03:00"  # UTC time window for backups
  copy_tags_to_snapshot   = true           # Copy instance tags to snapshots

  # Final snapshot when deleting the instance
  skip_final_snapshot       = false
  final_snapshot_identifier = "production-db-final-${formatdate("YYYY-MM-DD", timestamp())}"

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  # Encryption
  storage_encrypted = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Creating Manual Snapshots

You can create manual snapshots using the `aws_db_snapshot` resource:

```hcl
# Create a manual snapshot of an RDS instance
resource "aws_db_snapshot" "pre_migration" {
  db_instance_identifier = aws_db_instance.production.identifier
  db_snapshot_identifier = "pre-migration-snapshot-${formatdate("YYYY-MM-DD", timestamp())}"

  tags = {
    Environment = "production"
    Purpose     = "pre-migration-backup"
    ManagedBy   = "terraform"
  }
}
```

## Managing Aurora Cluster Snapshots

Aurora uses cluster-level snapshots that capture the entire cluster:

```hcl
# Aurora cluster with backup configuration
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "production-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  # Backup settings
  backup_retention_period = 14            # 14 days of automated backups
  preferred_backup_window = "02:00-03:00"
  copy_tags_to_snapshot   = true

  # Final snapshot
  skip_final_snapshot       = false
  final_snapshot_identifier = "aurora-final-snapshot"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Create a manual cluster snapshot
resource "aws_db_cluster_snapshot" "aurora_snapshot" {
  db_cluster_identifier          = aws_rds_cluster.aurora.id
  db_cluster_snapshot_identifier = "aurora-manual-snapshot"

  tags = {
    Environment = "production"
    Purpose     = "manual-backup"
  }
}
```

## Using AWS Backup for Centralized Snapshot Management

AWS Backup provides a centralized way to manage snapshots across multiple database services:

```hcl
# Create a backup vault
resource "aws_backup_vault" "database_vault" {
  name        = "database-backup-vault"
  kms_key_arn = aws_kms_key.backup_key.arn

  tags = {
    Environment = "production"
  }
}

# KMS key for backup encryption
resource "aws_kms_key" "backup_key" {
  description             = "KMS key for backup vault encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Create a backup plan
resource "aws_backup_plan" "database_plan" {
  name = "database-backup-plan"

  # Daily backups
  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.database_vault.name
    schedule          = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC

    lifecycle {
      cold_storage_after = 30   # Move to cold storage after 30 days
      delete_after       = 365  # Delete after 1 year
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_vault.arn  # Copy to DR region

      lifecycle {
        delete_after = 365
      }
    }
  }

  # Weekly backups with longer retention
  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.database_vault.name
    schedule          = "cron(0 3 ? * SUN *)"  # Sunday at 3 AM UTC

    lifecycle {
      cold_storage_after = 90
      delete_after       = 730  # Keep for 2 years
    }
  }

  # Monthly backups for compliance
  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.database_vault.name
    schedule          = "cron(0 4 1 * ? *)"  # First of each month at 4 AM

    lifecycle {
      cold_storage_after = 180
      delete_after       = 2555  # Keep for 7 years
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# IAM role for AWS Backup
resource "aws_iam_role" "backup_role" {
  name = "database-backup-role"

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
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForDynamoDB"
}

resource "aws_iam_role_policy_attachment" "backup_rds_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
}

# Select resources to back up
resource "aws_backup_selection" "databases" {
  name         = "database-backup-selection"
  plan_id      = aws_backup_plan.database_plan.id
  iam_role_arn = aws_iam_role.backup_role.arn

  # Back up specific resources
  resources = [
    aws_db_instance.production.arn,
    aws_rds_cluster.aurora.arn,
  ]

  # Or use tags to select resources
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "BackupPolicy"
    value = "daily"
  }
}
```

## Cross-Region Snapshot Copy

For disaster recovery, copy snapshots to another region:

```hcl
# Provider for the DR region
provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

# Backup vault in the DR region
resource "aws_backup_vault" "dr_vault" {
  provider = aws.dr
  name     = "database-dr-vault"

  tags = {
    Environment = "dr"
    Purpose     = "disaster-recovery"
  }
}
```

## Sharing Snapshots Across Accounts

You can share snapshots with other AWS accounts for development or testing:

```hcl
# Share an RDS snapshot with another AWS account
resource "aws_db_snapshot" "shared_snapshot" {
  db_instance_identifier = aws_db_instance.production.identifier
  db_snapshot_identifier = "shared-snapshot-for-dev"

  tags = {
    Purpose = "shared-with-dev-account"
  }
}

# Note: Snapshot sharing is done via AWS CLI or API
# terraform cannot directly share snapshots, but you can use a null_resource
resource "null_resource" "share_snapshot" {
  depends_on = [aws_db_snapshot.shared_snapshot]

  provisioner "local-exec" {
    command = <<-EOT
      aws rds modify-db-snapshot-attribute \
        --db-snapshot-identifier ${aws_db_snapshot.shared_snapshot.db_snapshot_identifier} \
        --attribute-name restore \
        --values-to-add "123456789012"
    EOT
  }
}
```

## Managing DynamoDB Snapshots with AWS Backup

```hcl
# Backup plan for DynamoDB tables
resource "aws_backup_plan" "dynamodb_plan" {
  name = "dynamodb-backup-plan"

  rule {
    rule_name         = "daily-dynamodb-backup"
    target_vault_name = aws_backup_vault.database_vault.name
    schedule          = "cron(0 2 * * ? *)"

    lifecycle {
      delete_after = 90
    }
  }
}

resource "aws_backup_selection" "dynamodb_tables" {
  name         = "dynamodb-backup-selection"
  plan_id      = aws_backup_plan.dynamodb_plan.id
  iam_role_arn = aws_iam_role.backup_role.arn

  # Select all DynamoDB tables with the backup tag
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "enabled"
  }
}
```

## Monitoring Snapshot Health

```hcl
# CloudWatch alarm for backup job failures
resource "aws_cloudwatch_metric_alarm" "backup_failures" {
  alarm_name          = "database-backup-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 86400
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when any backup job fails"

  alarm_actions = [aws_sns_topic.backup_alerts.arn]
}

resource "aws_sns_topic" "backup_alerts" {
  name = "backup-alerts"
}
```

For end-to-end monitoring of your backup and snapshot processes, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can provide dashboards that track backup success rates and storage utilization.

## Outputs

```hcl
output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = aws_backup_vault.database_vault.arn
}

output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = aws_backup_plan.database_plan.id
}

output "manual_snapshot_id" {
  description = "ID of the manual RDS snapshot"
  value       = aws_db_snapshot.pre_migration.id
}
```

## Best Practices

Set backup retention periods based on your compliance and recovery requirements. Always enable `copy_tags_to_snapshot` so your snapshots inherit the tags from the source resource. Use AWS Backup for centralized management across multiple database services. Configure cross-region copies for disaster recovery. Test your restore process regularly. Monitor backup job success rates. Use lifecycle rules to move old snapshots to cold storage and delete them when no longer needed. Never set `skip_final_snapshot` to true on production databases.

## Conclusion

Database snapshots are your safety net against data loss and corruption. Terraform provides comprehensive support for managing snapshot configurations across all AWS database services. By combining automated snapshots with AWS Backup plans, you can build a robust backup strategy that meets your recovery time and recovery point objectives. Define your backup policies as code and ensure consistent protection across all your database resources.
