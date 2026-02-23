# How to Create Aurora PostgreSQL Cluster in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Aurora, PostgreSQL, Database, High Availability

Description: Step-by-step guide to deploying Amazon Aurora PostgreSQL clusters with Terraform, covering cluster setup, reader instances, PostgreSQL extensions, and performance optimization.

---

Aurora PostgreSQL combines the reliability and feature richness of PostgreSQL with Aurora's high-performance storage engine. You get PostgreSQL compatibility - extensions, JSONB, CTEs, window functions - all running on a storage layer that replicates six ways across three availability zones. The result is a database that is both familiar and significantly more resilient than standard RDS PostgreSQL.

This guide covers creating an Aurora PostgreSQL cluster in Terraform, including the cluster and instance resources, PostgreSQL-specific parameter groups, extension management, and the operational details that matter in production.

## Cluster Configuration

The cluster resource manages the shared storage layer, backup policy, and cluster-wide settings:

```hcl
# Aurora PostgreSQL cluster
resource "aws_rds_cluster" "postgres" {
  cluster_identifier = "myapp-aurora-pg"

  # Engine settings
  engine         = "aurora-postgresql"
  engine_version = "16.2"

  # Database configuration
  database_name   = "myapp"
  master_username = "app_admin"
  master_password = var.db_password
  port            = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Cluster parameter group
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.postgres.name

  # Backup
  backup_retention_period      = 14
  preferred_backup_window      = "02:00-03:00"
  preferred_maintenance_window = "Sun:03:00-Sun:04:00"
  copy_tags_to_snapshot        = true

  # Encryption
  storage_encrypted = true

  # Protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "myapp-aurora-pg-final"

  # Log exports
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # IAM database authentication
  iam_database_authentication_enabled = true

  tags = {
    Name        = "myapp-aurora-pg"
    Environment = var.environment
  }
}
```

## Adding Cluster Instances

Each instance provides compute for the cluster. The first instance becomes the writer:

```hcl
# Aurora PostgreSQL instances
resource "aws_rds_cluster_instance" "postgres" {
  count = var.instance_count

  identifier         = "myapp-aurora-pg-${count.index}"
  cluster_identifier = aws_rds_cluster.postgres.id

  engine         = aws_rds_cluster.postgres.engine
  engine_version = aws_rds_cluster.postgres.engine_version
  instance_class = count.index == 0 ? var.writer_instance_class : var.reader_instance_class

  # Instance-level parameter group
  db_parameter_group_name = aws_db_parameter_group.aurora_pg.name

  # Monitoring
  monitoring_interval                   = 30
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  publicly_accessible    = false
  auto_minor_version_upgrade = true

  # Promotion tier (lower number = higher priority for failover)
  promotion_tier = count.index

  tags = {
    Name = "myapp-aurora-pg-${count.index}"
    Role = count.index == 0 ? "writer" : "reader"
  }
}

variable "instance_count" {
  description = "Total number of instances (1 writer + N-1 readers)"
  type        = number
  default     = 3
}

variable "writer_instance_class" {
  description = "Instance class for the writer"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "reader_instance_class" {
  description = "Instance class for readers"
  type        = string
  default     = "db.r6g.large"
}
```

Using different instance classes for writer and reader is a common pattern. The writer typically needs more resources since it handles writes and some reads, while readers can be smaller.

## Cluster Parameter Group for PostgreSQL

The cluster parameter group controls PostgreSQL settings that apply across all instances:

```hcl
# Cluster-level parameter group
resource "aws_rds_cluster_parameter_group" "postgres" {
  name        = "myapp-aurora-pg16-cluster"
  family      = "aurora-postgresql16"
  description = "Aurora PostgreSQL 16 cluster parameters"

  # Extensions that need shared_preload_libraries
  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements,pg_cron,pgaudit"
    apply_method = "pending-reboot"
  }

  # pg_stat_statements configuration
  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "pg_stat_statements.max"
    value = "10000"
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  # pgaudit settings
  parameter {
    name  = "pgaudit.log"
    value = "ddl,role"
  }

  # WAL settings (Aurora handles most WAL config, but some are tunable)
  parameter {
    name  = "checkpoint_timeout"
    value = "900"
  }

  tags = {
    Name = "myapp-aurora-pg16-cluster"
  }
}
```

## Instance Parameter Group

Instance-level parameters for per-node tuning:

```hcl
# Instance-level parameter group
resource "aws_db_parameter_group" "aurora_pg" {
  name        = "myapp-aurora-pg16-instance"
  family      = "aurora-postgresql16"
  description = "Aurora PostgreSQL 16 instance parameters"

  # Memory allocation
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "work_mem"
    value = "65536"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"
  }

  # Planner settings optimized for Aurora storage
  parameter {
    name  = "random_page_cost"
    value = "1.0"
    # Even lower than standard SSD because Aurora storage is network-attached
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }

  # Connection management
  parameter {
    name  = "max_connections"
    value = "1000"
    # Aurora supports more connections than standard PostgreSQL
  }

  # Hot standby settings for readers
  parameter {
    name  = "hot_standby_feedback"
    value = "1"
  }

  tags = {
    Name = "myapp-aurora-pg16-instance"
  }
}
```

## IAM Database Authentication

Aurora PostgreSQL supports IAM-based authentication, which avoids managing database passwords:

```hcl
# The cluster already has iam_database_authentication_enabled = true

# IAM policy for database access
resource "aws_iam_policy" "db_access" {
  name        = "aurora-pg-db-access"
  description = "Allow IAM authentication to Aurora PostgreSQL"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "rds-db:connect"
        Resource = "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_rds_cluster.postgres.cluster_resource_id}/app_user"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

After applying this, you would create the database user with IAM authentication:

```sql
-- Run this on the Aurora PostgreSQL cluster
CREATE USER app_user WITH LOGIN;
GRANT rds_iam TO app_user;
```

## Custom Endpoints

Create endpoints for different workload types:

```hcl
# Endpoint for reporting queries - uses specific reader instances
resource "aws_rds_cluster_endpoint" "reporting" {
  cluster_identifier          = aws_rds_cluster.postgres.id
  cluster_endpoint_identifier = "reporting"
  custom_endpoint_type        = "READER"

  # Route to instances 1 and 2 (the readers)
  static_members = [
    aws_rds_cluster_instance.postgres[1].id,
    aws_rds_cluster_instance.postgres[2].id,
  ]

  tags = {
    Name    = "reporting-endpoint"
    Purpose = "reporting-and-analytics"
  }
}

# Endpoint for the writer only (useful for admin tasks)
resource "aws_rds_cluster_endpoint" "admin" {
  cluster_identifier          = aws_rds_cluster.postgres.id
  cluster_endpoint_identifier = "admin"
  custom_endpoint_type        = "ANY"

  static_members = [aws_rds_cluster_instance.postgres[0].id]

  tags = {
    Name    = "admin-endpoint"
    Purpose = "admin-and-migrations"
  }
}
```

## Networking

```hcl
resource "aws_db_subnet_group" "aurora" {
  name       = "aurora-pg-subnets"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "aurora-pg-subnets" }
}

resource "aws_security_group" "aurora" {
  name_prefix = "aurora-pg-"
  vpc_id      = var.vpc_id
  description = "Aurora PostgreSQL cluster security group"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.app_security_group_ids
    description     = "PostgreSQL from application layer"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }

  tags = { Name = "aurora-pg-sg" }
}

resource "aws_iam_role" "rds_monitoring" {
  name = "aurora-pg-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Outputs

```hcl
output "cluster_endpoint" {
  description = "Writer endpoint"
  value       = aws_rds_cluster.postgres.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint (load balanced)"
  value       = aws_rds_cluster.postgres.reader_endpoint
}

output "reporting_endpoint" {
  description = "Custom reporting endpoint"
  value       = aws_rds_cluster_endpoint.reporting.endpoint
}

output "cluster_arn" {
  value = aws_rds_cluster.postgres.arn
}

output "cluster_resource_id" {
  description = "Cluster resource ID (used for IAM auth)"
  value       = aws_rds_cluster.postgres.cluster_resource_id
}
```

## PostgreSQL Extensions on Aurora

Aurora PostgreSQL supports most popular extensions. After the cluster is running, connect and enable them:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;  -- If you need geospatial
CREATE EXTENSION IF NOT EXISTS pg_cron;  -- For scheduled jobs
```

The `shared_preload_libraries` parameter in the cluster parameter group must include any extensions that need to be loaded at startup (like `pg_stat_statements` and `pg_cron`).

## Summary

An Aurora PostgreSQL cluster in Terraform uses `aws_rds_cluster` for the shared storage and configuration, `aws_rds_cluster_instance` for compute nodes, and separate parameter groups at both the cluster and instance level. The key advantages over standard RDS PostgreSQL are automatic storage scaling, faster replication, support for up to 15 readers, and IAM database authentication. Set `promotion_tier` on your instances to control failover priority, use custom endpoints to route different workloads to appropriate instances, and take advantage of PostgreSQL's extension system for additional functionality.
