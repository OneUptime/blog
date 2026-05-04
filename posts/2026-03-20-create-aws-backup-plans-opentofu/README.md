# How to Create AWS Backup Plans with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Backup, Backup Plan, Infrastructure as Code

Description: Learn how to create comprehensive AWS Backup plans with OpenTofu for multi-tier retention policies, cross-region replication, and compliance-driven backup schedules.

AWS Backup plans define when backups run, how long they're retained, and whether they're copied to other regions. Implementing different plans for different tiers of data ensures your backup strategy matches your recovery objectives.

## Production Backup Plan (Multi-Tier)

```hcl
resource "aws_backup_plan" "production_tiered" {
  name = "production-tiered-backup"

  # Hourly backups for databases - 24-hour retention
  rule {
    rule_name         = "hourly-db-backup"
    target_vault_name = aws_backup_vault.hot.name
    schedule          = "cron(0 * * * ? *)"  # Every hour

    lifecycle {
      delete_after = 1  # Delete after 1 day (24 hourly points)
    }
  }

  # Daily backups - 30-day retention (warm storage only)
  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"  # 3 AM UTC

    start_window      = 60
    completion_window = 180

    lifecycle {
      delete_after = 30  # Delete after 30 days
    }

    # Cross-region copy
    copy_action {
      destination_vault_arn = var.dr_vault_arn

      lifecycle {
        delete_after = 30
      }
    }
  }

  # Weekly backups - 1-year retention
  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 ? * 7 *)"  # 2 AM UTC every Saturday

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }

    copy_action {
      destination_vault_arn = var.dr_vault_arn

      lifecycle {
        cold_storage_after = 30
        delete_after       = 365
      }
    }
  }

  # Monthly backups - 7-year retention (compliance)
  rule {
    rule_name         = "monthly-backup"
    target_vault_name = aws_backup_vault.compliance.name
    schedule          = "cron(0 1 1 * ? *)"  # 1 AM UTC on the 1st

    lifecycle {
      cold_storage_after = 30
      delete_after       = 2555  # 7 years
    }
  }

  advanced_backup_setting {
    backup_options = {
      WindowsVSS = "enabled"  # Application-consistent backups for Windows
    }
    resource_type = "EC2"
  }

  tags = {
    Environment = "production"
    RetentionTier = "tiered"
  }
}
```

## Development Backup Plan (Light)

```hcl
resource "aws_backup_plan" "development" {
  name = "development-backup"

  rule {
    rule_name         = "daily-dev"
    target_vault_name = aws_backup_vault.dev.name
    schedule          = "cron(0 4 * * ? *)"  # 4 AM UTC daily

    lifecycle {
      delete_after = 7  # Keep 7 days only
    }
  }
}
```

## Environment-Specific Plans

```hcl
locals {
  backup_plans = {
    production = {
      vault     = aws_backup_vault.main.name
      schedule  = "cron(0 3 * * ? *)"
      retention = 90
      cold_storage_after = 30
    }
    staging = {
      vault     = aws_backup_vault.dev.name
      schedule  = "cron(0 4 * * ? *)"
      retention = 14
      cold_storage_after = null
    }
    development = {
      vault     = aws_backup_vault.dev.name
      schedule  = "cron(0 5 * * ? *)"
      retention = 3
      cold_storage_after = null
    }
  }
}

resource "aws_backup_plan" "envs" {
  for_each = local.backup_plans
  name     = "${each.key}-backup-plan"

  rule {
    rule_name         = "daily"
    target_vault_name = each.value.vault
    schedule          = each.value.schedule

    lifecycle {
      cold_storage_after = each.value.cold_storage_after
      delete_after       = each.value.retention
    }
  }
}
```

## Backup Report Plan

```hcl
resource "aws_backup_report_plan" "compliance" {
  name        = "backup-compliance-report"
  description = "Monthly backup compliance report"

  report_delivery_channel {
    formats        = ["CSV", "JSON"]
    s3_bucket_name = aws_s3_bucket.backup_reports.id
    s3_key_prefix  = "backup-reports/"
  }

  report_setting {
    report_template = "BACKUP_JOB_REPORT"
  }
}
```

## Conclusion

AWS Backup plans in OpenTofu implement granular retention tiers for different recovery scenarios. Hourly backups address last-hour recovery, daily backups cover last-30-days recovery, weekly backups provide up to 1-year point-in-time recovery, and monthly backups satisfy long-term compliance requirements. Always copy to a second region for DR, and use vault lock on compliance backups to prevent deletion.
