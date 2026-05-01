# How to Build a Disaster Recovery Environment with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Disaster Recovery, Backup, RTO, RPO, Infrastructure as Code

Description: Learn how to build a disaster recovery environment with OpenTofu using AWS Backup, cross-region replication, and infrastructure-as-code for rapid environment recreation.

## Introduction

A disaster recovery (DR) environment needs to meet your Recovery Time Objective (RTO) and Recovery Point Objective (RPO). OpenTofu plays two critical DR roles: maintaining the infrastructure definition as code (so environments can be recreated quickly) and provisioning the DR-specific resources like AWS Backup, cross-region replication, and warm standby infrastructure.

## AWS Backup for Centralized Backup Management

```hcl
resource "aws_backup_vault" "dr" {
  name        = "myapp-${var.environment}-dr-vault"
  kms_key_arn = aws_kms_key.backup.arn
}

resource "aws_backup_plan" "production" {
  name = "myapp-production-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.dr.name
    schedule          = "cron(0 2 * * ? *)"  # 2 AM UTC daily
    start_window      = 60
    completion_window = 120

    lifecycle {
      delete_after = 35  # keep 35 days of daily backups
    }

    copy_action {
      lifecycle {
        delete_after = 90
      }
      destination_vault_arn = aws_backup_vault.dr_secondary.arn  # cross-region copy
    }
  }

  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.dr.name
    schedule          = "cron(0 3 ? * SUN *)"  # Sunday 3 AM UTC
    start_window      = 60
    completion_window = 180

    lifecycle {
      cold_storage_after = 30   # move supported resource backups to cold after 30 days
      delete_after       = 365  # keep 1 year of weekly backups
    }
  }
}

resource "aws_backup_selection" "production" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "production-resources"
  plan_id      = aws_backup_plan.production.id

  # Tag-based selection - tag resources with Backup=true
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
}
```

## Cross-Region Backup Vault

```hcl
provider "aws" {
  alias  = "dr-region"
  region = var.dr_region  # e.g., "us-west-2" if primary is "us-east-1"
}

resource "aws_backup_vault" "dr_secondary" {
  provider    = aws.dr-region
  name        = "myapp-${var.environment}-dr-secondary-vault"
  kms_key_arn = aws_kms_key.backup_dr.arn
}
```

## RDS Automated Backups with Cross-Region Copy

```hcl
resource "aws_db_instance" "main" {
  identifier = "myapp-${var.environment}-db"
  # ... other config

  backup_retention_period   = 7
  backup_window             = "02:00-03:00"
  deletion_protection       = true
  copy_tags_to_snapshot     = true

  tags = {
    Backup = "true"  # included in AWS Backup selection
  }
}

# Cross-region automated backup replication

resource "aws_db_instance_automated_backups_replication" "dr" {
  source_db_instance_arn = aws_db_instance.main.arn
  kms_key_id             = aws_kms_key.backup_dr.arn

  provider = aws.dr-region
}
```

## Infrastructure as Code: The Real DR Tool

OpenTofu configurations are themselves the DR plan - any environment can be recreated.

```bash
# In a disaster: recreate entire production environment from code
export AWS_DEFAULT_REGION=us-west-2  # switch to DR region

# 1. Create the networking layer
tofu -chdir=environments/prod-dr/networking init
tofu -chdir=environments/prod-dr/networking apply -var-file=dr.tfvars

# 2. Restore RDS from latest backup
tofu -chdir=environments/prod-dr/database init
tofu -chdir=environments/prod-dr/database apply -var-file=dr.tfvars -var="restore_from_snapshot=myapp-prod-db-2026-03-19"

# 3. Deploy all application components
tofu -chdir=environments/prod-dr/applications init
tofu -chdir=environments/prod-dr/applications apply -var-file=dr.tfvars

# 4. Validate health checks
tofu -chdir=environments/prod-dr/applications output application_urls
```

## Recovery Testing Automation

```hcl
resource "aws_lambda_function" "dr_test" {
  function_name    = "myapp-dr-recovery-test"
  description      = "Monthly DR test: restore backup and validate application"
  filename         = "${path.module}/dr_test.zip"
  runtime          = "python3.11"
  handler          = "dr_test.handler"
  role             = aws_iam_role.dr_test.arn
  source_code_hash = filebase64sha256("${path.module}/dr_test.zip")
  timeout          = 600
}

resource "aws_cloudwatch_event_rule" "monthly_dr_test" {
  name                = "monthly-dr-test"
  schedule_expression = "cron(0 2 1 * ? *)"  # 1st of every month
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_test.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_dr_test.arn
}

resource "aws_cloudwatch_event_target" "dr_test" {
  rule      = aws_cloudwatch_event_rule.monthly_dr_test.name
  target_id = "RunDRTest"
  arn       = aws_lambda_function.dr_test.arn
}
```

## Summary

Disaster recovery with OpenTofu has two dimensions: the data DR layer (AWS Backup with cross-region vault copies, RDS automated backup replication, S3 cross-region replication) and the infrastructure DR layer (OpenTofu configurations that can recreate any environment in a new region within your RTO). The infrastructure-as-code aspect of OpenTofu means your DR plan is always up to date with your current infrastructure design. Schedule regular DR tests to verify RTO/RPO objectives can actually be met.
