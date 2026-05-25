# How to Create DynamoDB with Point-in-Time Recovery in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DynamoDB, Backup, Disaster Recovery, Infrastructure as Code

Description: Learn how to enable and manage point-in-time recovery for DynamoDB tables using Terraform to protect your data with continuous backups.

---

Data loss can happen in many ways, from application bugs that corrupt records to accidental deletions by team members. Amazon DynamoDB offers point-in-time recovery (PITR) as a safeguard against these scenarios. PITR provides continuous backups of your DynamoDB table data, allowing you to restore your table to any point in time within a recovery period of up to 35 days. In this guide, we will show you how to enable and manage PITR for DynamoDB tables using Terraform.

## What is Point-in-Time Recovery?

Point-in-time recovery maintains continuous backups of your DynamoDB table. Unlike on-demand backups, which capture a snapshot at a specific moment, PITR lets you restore to any second within the recovery window. The recovery window defaults to 35 days and can be configured from 1 to 35 days. When you restore, DynamoDB creates a new table with the data as it existed at the specified point in time.

PITR works at the table level and covers all items, including those in local secondary indexes and global secondary indexes. It does not affect the performance or availability of your table, and it works with both provisioned and on-demand capacity modes.

## Setting Up the Provider

```hcl
# Configure Terraform with the AWS provider

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

## Enabling Point-in-Time Recovery

Enabling PITR in Terraform is straightforward. You add a `point_in_time_recovery` block to your table resource:

```hcl
# Create a DynamoDB table with point-in-time recovery enabled
resource "aws_dynamodb_table" "users_table" {
  name         = "users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  # Enable point-in-time recovery for continuous backups
  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Backup      = "pitr-enabled"
  }
}
```

That single block is all you need. Once enabled, DynamoDB automatically maintains continuous backups with no performance impact. If you omit `recovery_period_in_days`, DynamoDB uses the default 35-day recovery period.

## Creating a Complete Production Table

For a production environment, you will want to combine PITR with other protective features like encryption and deletion protection:

```hcl
# Production-ready DynamoDB table with full protection
resource "aws_dynamodb_table" "production_table" {
  name                        = "production-orders"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "order_id"
  range_key                   = "created_at"
  deletion_protection_enabled = true  # Prevent accidental table deletion

  attribute {
    name = "order_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "customer_id"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }

  # Enable server-side encryption with AWS managed key
  server_side_encryption {
    enabled = true
  }

  # Global secondary index for customer lookups
  global_secondary_index {
    name            = "CustomerIndex"
    hash_key        = "customer_id"
    projection_type = "ALL"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Backup      = "pitr-enabled"
    DataClass   = "sensitive"
  }
}
```

## Using a Module for Consistent Configuration

When you have multiple tables that all need PITR, a Terraform module keeps your configuration consistent:

```hcl
# modules/dynamodb-table/variables.tf
variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "hash_key" {
  description = "The hash key (partition key) for the table"
  type        = string
}

variable "hash_key_type" {
  description = "The type of the hash key (S, N, or B)"
  type        = string
  default     = "S"
}

variable "range_key" {
  description = "The range key (sort key) for the table"
  type        = string
  default     = null
}

variable "enable_pitr" {
  description = "Whether to enable point-in-time recovery"
  type        = bool
  default     = true  # Enabled by default for safety
}

variable "pitr_recovery_period_in_days" {
  description = "Number of days to retain point-in-time recovery backups"
  type        = number
  default     = 35
}

variable "environment" {
  description = "The deployment environment"
  type        = string
}
```

```hcl
# modules/dynamodb-table/main.tf
resource "aws_dynamodb_table" "table" {
  name         = "${var.environment}-${var.table_name}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = var.hash_key
  range_key    = var.range_key

  attribute {
    name = var.hash_key
    type = var.hash_key_type
  }

  # Enable PITR based on the variable
  point_in_time_recovery {
    enabled                 = var.enable_pitr
    recovery_period_in_days = var.pitr_recovery_period_in_days
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    PITR        = var.enable_pitr ? "enabled" : "disabled"
  }
}
```

```hcl
# modules/dynamodb-table/outputs.tf
output "table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = aws_dynamodb_table.table.arn
}

output "table_name" {
  description = "The name of the DynamoDB table"
  value       = aws_dynamodb_table.table.name
}
```

Now you can use this module to create multiple tables with consistent settings:

```hcl
# main.tf - Using the module to create multiple tables
module "users_table" {
  source      = "./modules/dynamodb-table"
  table_name  = "users"
  hash_key    = "user_id"
  environment = "production"
  enable_pitr = true
}

module "sessions_table" {
  source      = "./modules/dynamodb-table"
  table_name  = "sessions"
  hash_key    = "session_id"
  environment = "production"
  enable_pitr = true
}

# Development tables might not need PITR
module "dev_scratch_table" {
  source      = "./modules/dynamodb-table"
  table_name  = "scratch"
  hash_key    = "id"
  environment = "dev"
  enable_pitr = false  # Save costs in development
}
```

## Combining PITR with On-Demand Backups

PITR and on-demand backups serve different purposes and can work together. PITR gives you continuous protection within a 1-to-35-day recovery window, while on-demand backups let you keep snapshots indefinitely:

```hcl
# Create the table with PITR
resource "aws_dynamodb_table" "critical_data" {
  name         = "critical-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "record_id"

  attribute {
    name = "record_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled                 = true
    recovery_period_in_days = 35
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Additionally create an on-demand backup using AWS Backup
resource "aws_backup_plan" "dynamodb_backup" {
  name = "dynamodb-weekly-backup"

  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.dynamodb_vault.name
    schedule          = "cron(0 3 ? * SUN *)"  # Every Sunday at 3 AM

    lifecycle {
      delete_after = 90  # Keep backups for 90 days
    }
  }
}

resource "aws_backup_vault" "dynamodb_vault" {
  name = "dynamodb-backup-vault"
}

resource "aws_backup_selection" "dynamodb_selection" {
  name         = "dynamodb-critical-tables"
  plan_id      = aws_backup_plan.dynamodb_backup.id
  iam_role_arn = aws_iam_role.backup_role.arn

  resources = [
    aws_dynamodb_table.critical_data.arn
  ]
}

# IAM role for AWS Backup
resource "aws_iam_role" "backup_role" {
  name = "dynamodb-backup-role"

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
```

## Restoring from Point-in-Time Recovery

Restoring a table using PITR creates a new table. You can restore through the AWS CLI or console and import the restored table afterward, or create the restored table directly with Terraform:

```hcl
resource "aws_dynamodb_table" "restored_users" {
  name                = "users-restored"
  billing_mode        = "PAY_PER_REQUEST"
  hash_key            = "user_id"
  restore_source_name = "users"
  restore_date_time   = "2026-02-20T12:00:00Z"

  attribute {
    name = "user_id"
    type = "S"
  }

  point_in_time_recovery {
    enabled                 = true  # Re-enable PITR on the restored table
    recovery_period_in_days = 35
  }

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    RestoredFrom = "users"
  }
}
```

## Monitoring PITR Status

You can use Terraform data sources to verify that PITR is enabled on your tables:

```hcl
# Check the PITR status using a data source
data "aws_dynamodb_table" "check_pitr" {
  name = aws_dynamodb_table.users_table.name
}

output "pitr_status" {
  description = "Point-in-time recovery status"
  value       = data.aws_dynamodb_table.check_pitr.point_in_time_recovery
}
```

For broader monitoring of your DynamoDB tables and their backup status, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-snapshots-with-terraform/view) can help you track backup health across your infrastructure.

## Cost Considerations

PITR is billed based on the size of each DynamoDB table, including table data and local secondary indexes. AWS charges per GB-month for the continuous backup storage, and shortening the recovery period does not reduce PITR cost. For large tables, the storage costs can add up. However, the peace of mind and operational simplicity usually make it worthwhile for production workloads.

For development and testing environments, you might choose to disable PITR to save costs, as shown in the module example above.

## Best Practices

Enable PITR on all production tables from day one. It is much easier to have it enabled from the start than to scramble when data loss occurs. Use tags to track which tables have PITR enabled so you can audit compliance. Combine PITR with on-demand backups for long-term retention beyond the PITR recovery window. Test your restore process periodically to make sure you know how to recover when you actually need it. Use deletion protection alongside PITR to prevent accidental table deletion.

## Conclusion

Point-in-time recovery is one of the simplest yet most valuable features you can enable on your DynamoDB tables. With just a few lines of Terraform configuration, you get continuous backups with second-level granularity and a recovery window of up to 35 days. There is no reason not to enable it on any table that holds data you care about. Make PITR part of your standard DynamoDB table template and sleep better knowing your data is protected.
