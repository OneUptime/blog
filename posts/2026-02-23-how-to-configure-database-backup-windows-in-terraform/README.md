# How to Configure Database Backup Windows in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Backups, RDS, Aurora, Infrastructure as Code

Description: Learn how to configure and manage database backup windows in Terraform for RDS, Aurora, ElastiCache, and other AWS database services.

---

Backup windows define when AWS takes automated snapshots of your database. Choosing the right backup window is important because the backup process can cause a brief increase in latency and I/O activity. By scheduling backups during your application's lowest traffic period, you minimize the impact on your users. In this guide, we will cover how to configure backup windows across different AWS database services using Terraform.

## Understanding Backup Windows

A backup window is a daily time period during which automated backups are created. For RDS and Aurora, AWS takes a storage-level snapshot during this window. The backup window is specified as a UTC time range, typically 30 minutes long, though the actual backup may take longer depending on your database size.

If you do not specify a backup window, AWS assigns a default window based on your region. For production databases, you should always specify an explicit window that aligns with your lowest traffic period.

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

## Configuring Backup Windows for RDS

```hcl
# RDS instance with explicit backup window
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
  backup_retention_period = 7              # Keep backups for 7 days
  backup_window           = "03:00-03:30"  # 3:00 AM to 3:30 AM UTC

  # Copy tags to snapshots for better organization
  copy_tags_to_snapshot = true

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  multi_az               = true
  storage_encrypted      = true

  # Final snapshot
  skip_final_snapshot       = false
  final_snapshot_identifier = "production-db-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    BackupWindow = "03:00-03:30 UTC"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

The backup window format is `HH:MM-HH:MM` in UTC. The window must be at least 30 minutes long and must not overlap with the maintenance window.

## Configuring Backup Windows for Aurora

Aurora uses cluster-level backup windows:

```hcl
# Aurora cluster with backup window
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "production-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  # Backup configuration
  backup_retention_period   = 14             # 14 days of automated backups
  preferred_backup_window   = "02:00-02:30"  # 2:00 AM to 2:30 AM UTC
  copy_tags_to_snapshot     = true

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "aurora-final"

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    BackupWindow = "02:00-02:30 UTC"
  }
}
```

## Configuring Backup Windows for ElastiCache Redis

ElastiCache Redis supports snapshots with configurable backup windows:

```hcl
# ElastiCache Redis with backup window
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "app-redis"
  description                = "Redis with configured backup window"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis_sg.id]

  # Backup configuration
  snapshot_window          = "04:00-05:00"  # 4:00 AM to 5:00 AM UTC
  snapshot_retention_limit = 7              # Keep snapshots for 7 days

  at_rest_encryption_enabled = true

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    BackupWindow = "04:00-05:00 UTC"
  }
}
```

## Configuring Backup Windows for DocumentDB

```hcl
# DocumentDB cluster with backup window
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier = "app-docdb"
  engine             = "docdb"
  engine_version     = "5.0.0"
  master_username    = "docdbadmin"
  master_password    = var.db_password

  # Backup configuration
  backup_retention_period  = 7
  preferred_backup_window  = "05:00-05:30"  # 5:00 AM to 5:30 AM UTC

  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  storage_encrypted      = true

  skip_final_snapshot = false
  final_snapshot_identifier = "docdb-final"

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    BackupWindow = "05:00-05:30 UTC"
  }
}
```

## Configuring Backup Windows for Neptune

```hcl
# Neptune cluster with backup window
resource "aws_neptune_cluster" "neptune" {
  cluster_identifier = "app-neptune"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  # Backup configuration
  backup_retention_period      = 7
  preferred_backup_window      = "06:00-06:30"  # 6:00 AM to 6:30 AM UTC

  neptune_subnet_group_name = aws_neptune_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]
  storage_encrypted         = true

  skip_final_snapshot = false
  final_snapshot_identifier = "neptune-final"

  tags = {
    Environment  = "production"
    ManagedBy    = "terraform"
    BackupWindow = "06:00-06:30 UTC"
  }
}
```

## Using Variables for Consistent Backup Windows

When managing multiple databases, use variables to keep backup windows organized and avoid overlaps:

```hcl
# Define backup windows for all database services
variable "backup_windows" {
  description = "Backup windows for each database service (UTC)"
  type        = map(string)
  default = {
    rds         = "02:00-02:30"
    aurora      = "02:30-03:00"
    elasticache = "03:00-04:00"
    documentdb  = "04:00-04:30"
    neptune     = "04:30-05:00"
  }
}

# Use the variables in your resources
resource "aws_db_instance" "app_db" {
  identifier              = "app-db"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "db.r6g.large"
  allocated_storage       = 100
  username                = "dbadmin"
  password                = var.db_password
  backup_retention_period = 7
  backup_window           = var.backup_windows["rds"]  # Uses the RDS window
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db_sg.id]
  storage_encrypted       = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "app-db-final"

  tags = {
    BackupWindow = var.backup_windows["rds"]
  }
}
```

## Staggering Backup Windows

When you have multiple databases, stagger their backup windows to avoid I/O contention if they share the same infrastructure:

```hcl
# Create multiple RDS instances with staggered backup windows
locals {
  databases = {
    users = {
      backup_window = "02:00-02:30"
    }
    orders = {
      backup_window = "02:30-03:00"
    }
    inventory = {
      backup_window = "03:00-03:30"
    }
    analytics = {
      backup_window = "03:30-04:00"
    }
  }
}

resource "aws_db_instance" "databases" {
  for_each = local.databases

  identifier     = "${each.key}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage       = 100
  username                = "dbadmin"
  password                = var.db_password
  backup_retention_period = 7
  backup_window           = each.value.backup_window
  copy_tags_to_snapshot   = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${each.key}-db-final"

  tags = {
    Environment  = "production"
    Database     = each.key
    BackupWindow = each.value.backup_window
  }
}
```

## Environment-Specific Backup Configurations

Different environments need different backup settings:

```hcl
# Environment-specific backup configuration
variable "environment" {
  type = string
}

locals {
  backup_config = {
    production = {
      retention_period = 14
      backup_window    = "02:00-02:30"
      multi_az         = true
    }
    staging = {
      retention_period = 7
      backup_window    = "06:00-06:30"
      multi_az         = false
    }
    development = {
      retention_period = 1
      backup_window    = "08:00-08:30"
      multi_az         = false
    }
  }

  current_config = local.backup_config[var.environment]
}

resource "aws_db_instance" "env_db" {
  identifier              = "${var.environment}-db"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = var.environment == "production" ? "db.r6g.large" : "db.t3.medium"
  allocated_storage       = 100
  username                = "dbadmin"
  password                = var.db_password
  backup_retention_period = local.current_config.retention_period
  backup_window           = local.current_config.backup_window
  multi_az                = local.current_config.multi_az
  copy_tags_to_snapshot   = true
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db_sg.id]
  storage_encrypted       = true
  skip_final_snapshot     = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-db-final" : null

  tags = {
    Environment  = var.environment
    BackupWindow = local.current_config.backup_window
  }
}
```

## Monitoring Backup Completion

Track whether backups complete successfully within the window:

```hcl
# Monitor backup duration using CloudWatch Events
resource "aws_cloudwatch_event_rule" "backup_events" {
  name        = "rds-backup-events"
  description = "Capture RDS backup events"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail_type = ["RDS DB Snapshot Event"]
    detail = {
      EventID = ["RDS-EVENT-0091"]  # Automated snapshot created
    }
  })
}

resource "aws_cloudwatch_event_target" "backup_notification" {
  rule      = aws_cloudwatch_event_rule.backup_events.name
  target_id = "backup-notification"
  arn       = aws_sns_topic.backup_notifications.arn
}

resource "aws_sns_topic" "backup_notifications" {
  name = "backup-notifications"
}
```

For comprehensive monitoring of backup windows and database health, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides dashboards to track backup success and timing.

## Best Practices

Always specify explicit backup windows rather than relying on AWS defaults. Schedule backup windows during your lowest traffic period. Ensure backup windows do not overlap with maintenance windows on the same instance. Stagger backup windows across multiple databases to avoid I/O contention. Use longer retention periods for production databases and shorter ones for development. Tag your resources with the backup window for easy reference. Monitor backup completion to ensure backups are succeeding within the expected time frame.

## Conclusion

Configuring database backup windows in Terraform is straightforward but requires careful planning. By scheduling backups during low-traffic periods, staggering windows across multiple databases, and adjusting retention periods per environment, you can minimize the impact on your application while maintaining robust data protection. Make backup window configuration part of your standard database provisioning template.
