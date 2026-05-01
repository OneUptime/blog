# How to Deploy Aurora MySQL Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Aurora, MySQL, RDS, High Availability, Infrastructure as Code

Description: Learn how to deploy Amazon Aurora MySQL clusters with OpenTofu, including cluster instances, subnet groups, parameter groups, and automated backups for production workloads.

## Introduction

Amazon Aurora MySQL is a MySQL-compatible relational database that delivers up to five times the performance of standard MySQL. Aurora clusters use a distributed storage layer that automatically replicates data across multiple Availability Zones, providing high durability and availability without the overhead of traditional replication.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS/Aurora permissions
- An existing VPC with private subnets

## Step 1: Create DB Subnet Group

```hcl
resource "aws_db_subnet_group" "aurora" {
  name       = "${var.project_name}-aurora-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-aurora-subnet-group"
  }
}
```

## Step 2: Create Aurora MySQL Parameter Groups

```hcl
# Cluster parameter group

resource "aws_rds_cluster_parameter_group" "aurora_mysql" {
  name        = "${var.project_name}-aurora-mysql-cluster-pg"
  family      = "aurora-mysql8.0"
  description = "Aurora MySQL 8.0 cluster parameter group"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "innodb_lock_wait_timeout"
    value = "50"
  }
}

# Instance parameter group
resource "aws_db_parameter_group" "aurora_mysql" {
  name   = "${var.project_name}-aurora-mysql-instance-pg"
  family = "aurora-mysql8.0"

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }
}
```

## Step 3: Create Aurora MySQL Cluster

```hcl
resource "aws_rds_cluster" "aurora_mysql" {
  cluster_identifier      = "${var.project_name}-aurora-mysql"
  engine                  = "aurora-mysql"
  engine_version          = "8.0.mysql_aurora.3.04.6"

  database_name   = var.database_name
  master_username = var.master_username
  master_password = var.master_password

  db_subnet_group_name            = aws_db_subnet_group.aurora.name
  vpc_security_group_ids          = [var.rds_security_group_id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora_mysql.name

  # Enable encryption at rest
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  # Automated backups
  backup_retention_period = 14
  preferred_backup_window = "02:00-03:00"

  # Enable deletion protection in production
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-aurora-mysql-final"

  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  tags = {
    Name        = "${var.project_name}-aurora-mysql"
    Environment = var.environment
  }
}
```

## Step 4: Create Aurora Cluster Instances

```hcl
# Writer instance
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.project_name}-aurora-mysql-writer"
  cluster_identifier = aws_rds_cluster.aurora_mysql.id
  instance_class     = "db.r6g.xlarge"
  engine             = aws_rds_cluster.aurora_mysql.engine
  engine_version     = aws_rds_cluster.aurora_mysql.engine_version

  db_parameter_group_name  = aws_db_parameter_group.aurora_mysql.name
  db_subnet_group_name     = aws_db_subnet_group.aurora.name

  performance_insights_enabled    = true
  performance_insights_kms_key_id = var.kms_key_arn
  monitoring_interval             = 60
  monitoring_role_arn             = var.monitoring_role_arn

  auto_minor_version_upgrade = false

  tags = {
    Name = "${var.project_name}-aurora-mysql-writer"
    Role = "writer"
  }
}

# Reader instance
resource "aws_rds_cluster_instance" "reader" {
  count = 2

  identifier         = "${var.project_name}-aurora-mysql-reader-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.aurora_mysql.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora_mysql.engine
  engine_version     = aws_rds_cluster.aurora_mysql.engine_version

  db_parameter_group_name = aws_db_parameter_group.aurora_mysql.name
  db_subnet_group_name    = aws_db_subnet_group.aurora.name

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = var.monitoring_role_arn
  auto_minor_version_upgrade   = false

  tags = {
    Name = "${var.project_name}-aurora-mysql-reader-${count.index + 1}"
    Role = "reader"
  }
}
```

## Step 5: Outputs

```hcl
output "cluster_endpoint" {
  description = "Writer endpoint for read/write connections"
  value       = aws_rds_cluster.aurora_mysql.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint for read-only connections"
  value       = aws_rds_cluster.aurora_mysql.reader_endpoint
}

output "cluster_identifier" {
  value = aws_rds_cluster.aurora_mysql.cluster_identifier
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Aurora MySQL clusters provide a production-ready database with automatic failover, up to 15 read replicas sharing the same storage layer, and continuous backups to S3. Direct read traffic to the reader endpoint and writes to the cluster endpoint-Aurora handles routing automatically. Enable Performance Insights and Enhanced Monitoring for visibility into query performance and instance-level metrics.
