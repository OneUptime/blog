# How to Configure Database Maintenance Windows in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Maintenance, RDS, Aurora, Infrastructure as Code

Description: Learn how to configure and manage database maintenance windows in Terraform for RDS, Aurora, ElastiCache, and other AWS database services.

---

Database maintenance windows define when AWS can perform system updates, patching, and other maintenance activities on your managed database instances. Properly configuring these windows is essential for minimizing downtime and ensuring that maintenance happens during acceptable periods. In this guide, we will walk through how to configure maintenance windows across different AWS database services using Terraform.

## Understanding Maintenance Windows

A maintenance window is a weekly time period during which AWS may perform system maintenance on your database instances. This includes operating system patching, database engine updates, and hardware maintenance. Not all maintenance windows result in actual maintenance; AWS only uses the window when updates are pending.

During maintenance, your database may experience brief periods of unavailability. For Multi-AZ deployments, the maintenance is typically performed on the standby first, then a failover occurs, and finally the old primary is updated. This reduces downtime to the failover time, which is usually 60 to 120 seconds.

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

## Configuring Maintenance Windows for RDS

```hcl
# RDS instance with explicit maintenance window
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

  # Maintenance window: Sunday 5:00 AM to 5:30 AM UTC
  maintenance_window = "sun:05:00-sun:05:30"

  # Control automatic minor version upgrades
  auto_minor_version_upgrade = true

  # Backup window (must not overlap with maintenance window)
  backup_retention_period = 7
  backup_window           = "02:00-02:30"

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  multi_az               = true
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "production-db-final"

  tags = {
    Environment       = "production"
    ManagedBy         = "terraform"
    MaintenanceWindow = "Sun 05:00-05:30 UTC"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

The maintenance window format is `ddd:hh24:mi-ddd:hh24:mi` where `ddd` is the day of the week (mon, tue, wed, thu, fri, sat, sun). The window must be at least 30 minutes and must not overlap with the backup window.

## Configuring Maintenance Windows for Aurora

```hcl
# Aurora cluster with maintenance window
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "production-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  # Maintenance window at the cluster level
  preferred_maintenance_window = "sun:06:00-sun:06:30"

  # Backup settings (must not overlap with maintenance)
  backup_retention_period = 14
  preferred_backup_window = "02:00-02:30"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "aurora-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Aurora instances can have their own maintenance windows
resource "aws_rds_cluster_instance" "aurora_instances" {
  count = 3

  identifier         = "aurora-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version

  # Stagger maintenance windows across instances
  preferred_maintenance_window = "sun:0${count.index + 5}:00-sun:0${count.index + 5}:30"

  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
    Instance    = count.index + 1
  }
}
```

## Configuring Maintenance Windows for ElastiCache

```hcl
# ElastiCache with maintenance window
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "app-redis"
  description                = "Redis with configured maintenance window"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis_sg.id]

  # Maintenance window
  maintenance_window = "sun:07:00-sun:08:00"

  # Backup settings
  snapshot_window          = "03:00-04:00"
  snapshot_retention_limit = 7

  # Auto upgrade for minor versions
  auto_minor_version_upgrade = true

  at_rest_encryption_enabled = true

  tags = {
    Environment       = "production"
    MaintenanceWindow = "Sun 07:00-08:00 UTC"
  }
}
```

## Configuring Maintenance Windows for DocumentDB

```hcl
# DocumentDB cluster with maintenance window
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier = "app-docdb"
  engine             = "docdb"
  engine_version     = "5.0.0"
  master_username    = "docdbadmin"
  master_password    = var.db_password

  # Maintenance window
  preferred_maintenance_window = "sat:08:00-sat:08:30"

  # Backup settings
  backup_retention_period = 7
  preferred_backup_window = "04:00-04:30"

  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "docdb-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# DocumentDB instances with staggered windows
resource "aws_docdb_cluster_instance" "instances" {
  count = 3

  identifier         = "docdb-instance-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = "db.r6g.large"
  engine             = "docdb"

  # Stagger instance maintenance windows
  preferred_maintenance_window = count.index == 0 ? "sat:08:00-sat:08:30" : "sat:0${8 + count.index}:00-sat:0${8 + count.index}:30"

  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
    Instance    = count.index + 1
  }
}
```

## Configuring Maintenance Windows for Neptune

```hcl
# Neptune cluster with maintenance window
resource "aws_neptune_cluster" "neptune" {
  cluster_identifier = "app-neptune"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  # Maintenance window
  preferred_maintenance_window = "sun:09:00-sun:09:30"

  # Backup settings
  backup_retention_period = 7
  preferred_backup_window = "05:00-05:30"

  neptune_subnet_group_name = aws_neptune_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]
  storage_encrypted         = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "neptune-final"

  tags = {
    Environment = "production"
  }
}
```

## Using a Centralized Maintenance Schedule

Keep all maintenance windows organized in one place:

```hcl
# Centralized maintenance schedule
locals {
  # All times in UTC - scheduled for Sunday early morning
  maintenance_schedule = {
    rds_primary    = "sun:04:00-sun:04:30"
    rds_replica    = "sun:04:30-sun:05:00"
    aurora_cluster = "sun:05:00-sun:05:30"
    aurora_writer  = "sun:05:30-sun:06:00"
    aurora_reader  = "sun:06:00-sun:06:30"
    elasticache    = "sun:06:30-sun:07:30"
    documentdb     = "sun:07:30-sun:08:00"
    neptune        = "sun:08:00-sun:08:30"
  }

  # Backup windows (must not overlap with maintenance)
  backup_schedule = {
    rds         = "01:00-01:30"
    aurora      = "01:30-02:00"
    elasticache = "02:00-03:00"
    documentdb  = "03:00-03:30"
    neptune     = "03:30-04:00"
  }
}
```

## Controlling Auto Minor Version Upgrades

The `auto_minor_version_upgrade` setting controls whether minor version upgrades are applied automatically during the maintenance window:

```hcl
# Production: Enable auto minor version upgrades
resource "aws_db_instance" "prod_db" {
  identifier                 = "prod-db"
  engine                     = "postgres"
  engine_version             = "15.4"
  instance_class             = "db.r6g.large"
  allocated_storage          = 100
  username                   = "dbadmin"
  password                   = var.db_password
  maintenance_window         = "sun:05:00-sun:05:30"
  auto_minor_version_upgrade = true  # Automatically apply minor patches
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.db_sg.id]
  storage_encrypted          = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "prod-db-final"

  tags = {
    Environment = "production"
    AutoUpgrade = "enabled"
  }
}
```

## Monitoring Maintenance Events

Track maintenance events using CloudWatch Events:

```hcl
# Capture RDS maintenance events
resource "aws_cloudwatch_event_rule" "rds_maintenance" {
  name        = "rds-maintenance-events"
  description = "Capture RDS maintenance notifications"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail_type = ["RDS DB Instance Event"]
    detail = {
      EventCategories = ["maintenance"]
    }
  })
}

resource "aws_cloudwatch_event_target" "maintenance_notification" {
  rule      = aws_cloudwatch_event_rule.rds_maintenance.name
  target_id = "maintenance-notification"
  arn       = aws_sns_topic.maintenance_alerts.arn
}

resource "aws_sns_topic" "maintenance_alerts" {
  name = "database-maintenance-alerts"
}

resource "aws_sns_topic_policy" "maintenance_alerts" {
  arn = aws_sns_topic.maintenance_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.maintenance_alerts.arn
      }
    ]
  })
}
```

For comprehensive monitoring of maintenance windows and database uptime, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track when maintenance occurs and its impact on your application.

## Best Practices

Always set explicit maintenance windows rather than relying on AWS defaults. Schedule maintenance during your lowest traffic period. Never overlap maintenance windows with backup windows on the same instance. Stagger maintenance windows across instances in a cluster to minimize impact. Use Multi-AZ deployments for production to reduce maintenance-related downtime. Enable auto minor version upgrades to keep your databases patched. Monitor maintenance events via CloudWatch Events and SNS. Test maintenance procedures in staging environments before production.

## Conclusion

Configuring maintenance windows in Terraform gives you control over when AWS performs updates on your database infrastructure. By scheduling maintenance during low-traffic periods, staggering windows across instances, and monitoring maintenance events, you can minimize the impact on your application. Make maintenance window configuration a standard part of your database provisioning process.
