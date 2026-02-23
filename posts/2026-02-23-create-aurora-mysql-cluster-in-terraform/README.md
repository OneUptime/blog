# How to Create Aurora MySQL Cluster in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Aurora, MySQL, Database, High Availability

Description: A hands-on guide to deploying Amazon Aurora MySQL clusters with Terraform, covering cluster configuration, instance management, endpoints, and MySQL-specific optimizations.

---

Amazon Aurora MySQL is a drop-in replacement for MySQL that runs on AWS's custom storage engine. It delivers up to five times the throughput of standard MySQL, automatic storage scaling up to 128TB, and replication lag measured in milliseconds rather than seconds. The architecture is fundamentally different from regular RDS MySQL - you have a shared storage layer with separate compute instances that read from and write to it.

This guide walks through creating an Aurora MySQL cluster in Terraform, from the cluster resource and instances to endpoints, parameter groups, and the MySQL-specific settings you need to know about.

## Aurora MySQL Architecture

Understanding the pieces before writing code helps:

- **Cluster** - the logical database with shared storage. Holds configuration, endpoints, and backup settings
- **Writer instance** - the primary compute node that handles reads and writes
- **Reader instances** - additional compute nodes that handle read traffic
- **Cluster endpoint** - always points to the writer
- **Reader endpoint** - load balances across all readers

In Terraform, you create the cluster first, then add instances to it.

## The Cluster Resource

```hcl
# Aurora MySQL cluster
resource "aws_rds_cluster" "mysql" {
  cluster_identifier = "myapp-aurora-mysql"

  # Engine configuration
  engine         = "aurora-mysql"
  engine_version = "8.0.mysql_aurora.3.07.1"

  # Database settings
  database_name   = "myapp"
  master_username = "admin"
  master_password = var.db_password
  port            = 3306

  # Network
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Backup configuration
  backup_retention_period      = 14
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "Sun:04:00-Sun:05:00"

  # Encryption
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn  # Optional, uses default key if omitted

  # Cluster parameter group
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.mysql.name

  # Protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "myapp-aurora-mysql-final"

  # Copy tags to snapshots
  copy_tags_to_snapshot = true

  # Enable CloudWatch log exports
  enabled_cloudwatch_logs_exports = ["audit", "error", "slowquery"]

  tags = {
    Name        = "myapp-aurora-mysql"
    Environment = var.environment
  }
}
```

## Cluster Instances

The cluster itself does not have compute - you add instances separately:

```hcl
# Aurora MySQL cluster instances
resource "aws_rds_cluster_instance" "mysql" {
  count = var.instance_count  # Typically 2-3 for production

  identifier         = "myapp-aurora-mysql-${count.index}"
  cluster_identifier = aws_rds_cluster.mysql.id

  instance_class = var.instance_class
  engine         = aws_rds_cluster.mysql.engine
  engine_version = aws_rds_cluster.mysql.engine_version

  # Instance-level parameter group
  db_parameter_group_name = aws_db_parameter_group.aurora_mysql.name

  # Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Spread instances across AZs
  # Aurora handles this automatically, but you can be explicit
  publicly_accessible = false

  tags = {
    Name  = "myapp-aurora-mysql-${count.index}"
    Role  = count.index == 0 ? "writer" : "reader"
  }
}

variable "instance_count" {
  description = "Number of Aurora instances (1 writer + N-1 readers)"
  type        = number
  default     = 2
}

variable "instance_class" {
  description = "Instance class for Aurora instances"
  type        = string
  default     = "db.r6g.large"
}
```

The first instance in the cluster becomes the writer. Additional instances become readers. If the writer fails, Aurora automatically promotes one of the readers.

## Cluster Parameter Group

Cluster-level parameters apply to all instances in the cluster:

```hcl
# Cluster parameter group for Aurora MySQL 8.0
resource "aws_rds_cluster_parameter_group" "mysql" {
  name        = "myapp-aurora-mysql80-cluster"
  family      = "aurora-mysql8.0"
  description = "Cluster parameters for Aurora MySQL 8.0"

  # Character set
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  # Binary log format for replication compatibility
  parameter {
    name         = "binlog_format"
    value        = "ROW"
    apply_method = "pending-reboot"
  }

  # Slow query logging
  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  # Audit logging
  parameter {
    name  = "server_audit_logging"
    value = "1"
  }

  parameter {
    name  = "server_audit_events"
    value = "CONNECT,QUERY_DCL,QUERY_DDL"
  }

  tags = {
    Name = "myapp-aurora-mysql80-cluster"
  }
}
```

## Instance Parameter Group

Instance-level parameters can differ between the writer and readers:

```hcl
# Instance-level parameter group
resource "aws_db_parameter_group" "aurora_mysql" {
  name        = "myapp-aurora-mysql80-instance"
  family      = "aurora-mysql8.0"
  description = "Instance parameters for Aurora MySQL 8.0"

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "1000"
    # Aurora supports more connections than standard MySQL
  }

  # InnoDB settings
  parameter {
    name  = "innodb_flush_log_at_trx_commit"
    value = "1"
  }

  parameter {
    name  = "innodb_lock_wait_timeout"
    value = "50"
  }

  # Thread pool (Aurora-specific)
  parameter {
    name  = "thread_handling"
    value = "pool-of-threads"
  }

  tags = {
    Name = "myapp-aurora-mysql80-instance"
  }
}
```

## Supporting Resources

```hcl
# Subnet group for Aurora
resource "aws_db_subnet_group" "aurora" {
  name       = "aurora-mysql-subnets"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "aurora-mysql-subnets"
  }
}

# Security group
resource "aws_security_group" "aurora" {
  name_prefix = "aurora-mysql-"
  vpc_id      = var.vpc_id
  description = "Security group for Aurora MySQL cluster"

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "MySQL from application servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "aurora-mysql-sg"
  }
}

# IAM role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "aurora-mysql-monitoring"

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

## Custom Endpoints

Beyond the default cluster and reader endpoints, you can create custom endpoints for specific use cases:

```hcl
# Custom endpoint for analytics queries (routes to specific readers)
resource "aws_rds_cluster_endpoint" "analytics" {
  cluster_identifier          = aws_rds_cluster.mysql.id
  cluster_endpoint_identifier = "analytics"
  custom_endpoint_type        = "READER"

  # Only route to specific instances designated for analytics
  static_members = [aws_rds_cluster_instance.mysql[1].id]

  tags = {
    Name    = "analytics-endpoint"
    Purpose = "analytics-queries"
  }
}
```

## Outputs

```hcl
output "cluster_endpoint" {
  description = "Writer endpoint for the Aurora MySQL cluster"
  value       = aws_rds_cluster.mysql.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint (load balanced across readers)"
  value       = aws_rds_cluster.mysql.reader_endpoint
}

output "cluster_arn" {
  description = "ARN of the Aurora cluster"
  value       = aws_rds_cluster.mysql.arn
}

output "instance_endpoints" {
  description = "Endpoints for individual instances"
  value       = aws_rds_cluster_instance.mysql[*].endpoint
}
```

## Differences from Standard RDS MySQL

A few things work differently on Aurora MySQL compared to standard RDS MySQL:

- Storage is automatic. You do not set `allocated_storage` - Aurora grows as needed up to 128TB.
- Replication lag is typically under 20ms because readers share the same storage volume.
- You can have up to 15 reader instances instead of 5 read replicas.
- Backups are continuous and incremental, taken from the shared storage layer.
- The `innodb_buffer_pool_size` parameter works differently - Aurora manages the buffer pool across the shared storage layer.

## Summary

An Aurora MySQL cluster in Terraform consists of the `aws_rds_cluster` for the cluster itself and `aws_rds_cluster_instance` resources for compute instances. The cluster handles storage, backups, and encryption, while instances handle the actual query processing. Use cluster parameter groups for settings that apply globally and instance parameter groups for per-instance tuning. For applications migrating from standard MySQL, Aurora is largely compatible - you mainly need to update your connection logic to use the cluster and reader endpoints appropriately.
