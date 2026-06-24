# How to Deploy Aurora PostgreSQL Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Aurora, PostgreSQL, RDS, High Availability, Infrastructure as Code

Description: Learn how to deploy Amazon Aurora PostgreSQL clusters with OpenTofu, including cluster and instance parameter groups, IAM authentication, and Performance Insights configuration.

## Introduction

Amazon Aurora PostgreSQL is a PostgreSQL-compatible relational database that, with some workloads, can deliver up to three times the throughput of standard PostgreSQL. It uses a distributed storage architecture that replicates data six ways across three Availability Zones, providing enterprise-grade durability with service typically restored in under 60 seconds during failover, and often under 30 seconds.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS/Aurora permissions
- An existing VPC with private subnets in multiple AZs

## Step 1: Create Cluster Parameter Group

```hcl
resource "aws_rds_cluster_parameter_group" "aurora_pg" {
  name        = "${var.project_name}-aurora-pg-cluster-pg"
  family      = "aurora-postgresql16"
  description = "Aurora PostgreSQL 16 cluster parameter group"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }

  parameter {
    name         = "rds.force_ssl"
    value        = "1"
    apply_method = "pending-reboot"
  }
}
```

## Step 2: Create Aurora PostgreSQL Cluster

```hcl
resource "random_password" "aurora_pg" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "aurora_pg" {
  name       = "${var.project_name}/aurora-postgresql/master"
  kms_key_id = var.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "aurora_pg" {
  secret_id = aws_secretsmanager_secret.aurora_pg.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.aurora_pg.result
    engine   = "aurora-postgresql"
    host     = aws_rds_cluster.aurora_pg.endpoint
    port     = 5432
    dbname   = var.database_name
  })
}

resource "aws_rds_cluster" "aurora_pg" {
  cluster_identifier = "${var.project_name}-aurora-pg"
  engine             = "aurora-postgresql"
  engine_version     = "16.1"

  database_name   = var.database_name
  master_username = var.master_username
  master_password = random_password.aurora_pg.result

  db_subnet_group_name            = var.subnet_group_name
  vpc_security_group_ids          = [var.rds_security_group_id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora_pg.name

  # Enable IAM database authentication
  iam_database_authentication_enabled = true

  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  backup_retention_period   = 14
  preferred_backup_window   = "02:00-03:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  copy_tags_to_snapshot = true
  deletion_protection   = true
  skip_final_snapshot   = false
  final_snapshot_identifier = "${var.project_name}-aurora-pg-final"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "${var.project_name}-aurora-pg"
    Environment = var.environment
  }
}
```

## Step 3: Create Cluster Instances

```hcl
resource "aws_rds_cluster_instance" "aurora_pg" {
  count = var.instance_count  # e.g., 2 for writer + 1 reader

  identifier         = "${var.project_name}-aurora-pg-${count.index}"
  cluster_identifier = aws_rds_cluster.aurora_pg.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.aurora_pg.engine
  engine_version     = aws_rds_cluster.aurora_pg.engine_version

  db_subnet_group_name = var.subnet_group_name

  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.kms_key_arn
  performance_insights_retention_period = 731  # 2 years

  monitoring_interval = 60
  monitoring_role_arn = var.monitoring_role_arn

  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-aurora-pg-${count.index}"
  }
}
```

## Step 4: IAM Policy for IAM Authentication

```hcl
resource "aws_iam_policy" "aurora_pg_connect" {
  name = "${var.project_name}-aurora-pg-connect"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "rds-db:connect"
      Resource = [
        "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_rds_cluster.aurora_pg.cluster_resource_id}/app_user"
      ]
    }]
  })
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify cluster status

aws rds describe-db-clusters \
  --db-cluster-identifier my-project-aurora-pg \
  --query 'DBClusters[0].{Status: Status, Endpoint: Endpoint, Reader: ReaderEndpoint}'
```

## Conclusion

Aurora PostgreSQL combines PostgreSQL compatibility with Aurora's distributed storage engine for superior performance and availability. Enable IAM database authentication to eliminate password management for application users, and use the reader endpoint to distribute read queries across replica instances. Performance Insights provides SQL-level query analysis to identify and optimize slow queries.
