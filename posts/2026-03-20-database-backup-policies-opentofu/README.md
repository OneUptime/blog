# How to Configure Database Backup Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Database Backup, AWS, RDS, Azure, GCP, Infrastructure as Code

Description: Learn how to configure database backup policies with OpenTofu - setting retention periods, backup windows, automated snapshots, and cross-region backup replication for RDS, Azure SQL, and Cloud SQL.

## Introduction

Database backup policies define retention periods, backup windows, and cross-region replication for disaster recovery. OpenTofu manages backup configuration across AWS RDS, Azure SQL, and GCP Cloud SQL as code - ensuring consistent backup policies enforced across all environments.

## AWS RDS Backup Configuration

```hcl
resource "aws_db_instance" "app" {
  identifier        = "${var.environment}-app-db"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 100

  # Backup configuration
  backup_retention_period   = 30          # Days to retain automated backups
  backup_window             = "03:00-04:00"  # UTC - daily backup window
  maintenance_window        = "Sun:04:00-Sun:05:00"

  # Keep final snapshot on deletion
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.environment}-app-db-final-${formatdate("YYYYMMDD", timestamp())}"

  # Copy automated backups to another region for DR
  backup_target             = "region"  # or "outposts"

  # Enable Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Enable Enhanced Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  tags = { Environment = var.environment }
}
```

## RDS Cross-Region Backup Copy

```hcl
# Automatically copy snapshots to a secondary region

resource "aws_db_instance_automated_backups_replication" "dr" {
  source_db_instance_arn    = aws_db_instance.app.arn
  kms_key_id                = aws_kms_key.rds_replica.arn  # Key in destination region
  pre_signed_url            = null  # Handled automatically

  provider = aws.eu_west_1  # Destination region
}
```

## Aurora Backup Configuration

```hcl
resource "aws_rds_cluster" "app" {
  cluster_identifier = "${var.environment}-aurora-cluster"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"

  backup_retention_period   = 14
  preferred_backup_window   = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.environment}-aurora-final"

  # Enable backtrack for point-in-time recovery (Aurora MySQL only)
  # backtrack_window = 86400  # 24 hours in seconds

  deletion_protection = true  # Prevent accidental deletion

  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn
}
```

## AWS Backup for Centralized Backup Management

```hcl
resource "aws_backup_vault" "app" {
  name        = "${var.environment}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = { Environment = var.environment }
}

resource "aws_backup_plan" "rds" {
  name = "${var.environment}-rds-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.app.name
    schedule          = "cron(0 3 * * ? *)"  # 3 AM UTC daily

    start_window      = 60   # Minutes to start backup
    completion_window = 180  # Minutes to complete backup

    lifecycle {
      cold_storage_after = 30   # Move to cold storage after 30 days
      delete_after       = 365  # Delete after 365 days
    }

    copy_action {
      destination_vault_arn = "arn:aws:backup:eu-west-1:${data.aws_caller_identity.current.account_id}:backup-vault:${var.environment}-backup-vault-eu"

      lifecycle {
        delete_after = 90
      }
    }
  }

  rule {
    rule_name         = "weekly-backup"
    target_vault_name = aws_backup_vault.app.name
    schedule          = "cron(0 2 ? * SUN *)"  # Sundays at 2 AM

    lifecycle {
      delete_after = 2557  # 7 years for compliance
    }
  }
}

resource "aws_backup_selection" "rds" {
  name         = "${var.environment}-rds-selection"
  plan_id      = aws_backup_plan.rds.id
  iam_role_arn = aws_iam_role.backup.arn

  resources = [aws_db_instance.app.arn]
}
```

## Azure SQL Backup Policy

```hcl
resource "azurerm_mssql_database" "app" {
  name      = "${var.environment}-app-db"
  server_id = azurerm_mssql_server.app.id
  sku_name  = "GP_Gen5_2"

  geo_backup_enabled = true  # Cross-region backup

  short_term_retention_policy {
    retention_days           = 35  # 1-35 days
    backup_interval_in_hours = 12  # 12 or 24
  }

  long_term_retention_policy {
    weekly_retention  = "P1M"   # 1 month
    monthly_retention = "P12M"  # 12 months
    yearly_retention  = "P7Y"   # 7 years
    week_of_year      = 1       # First week of the year for yearly backup
  }
}
```

## GCP Cloud SQL Backup Configuration

```hcl
resource "google_sql_database_instance" "app" {
  name             = "${var.environment}-app-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-2-4096"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"  # UTC
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }
  }
}
```

## Conclusion

Database backup policies with OpenTofu enforce consistent retention and recovery settings across all environments. For AWS RDS, set `backup_retention_period` to at least 7 days (30 for production) and always create a `final_snapshot_identifier` to prevent data loss on deletion. Use AWS Backup for centralized multi-service backup management with cross-region copy rules for DR. On Azure, configure both short-term (35 days max) and long-term retention policies separately. Enable `point_in_time_recovery_enabled` on GCP Cloud SQL for sub-minute RPO.
