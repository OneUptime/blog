# How to Create RDS PostgreSQL Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, PostgreSQL, Database, Infrastructure as Code, Production

Description: Learn how to create a production-ready RDS PostgreSQL instance with encryption, Multi-AZ, Performance Insights, and IAM authentication using OpenTofu.

## Introduction

Amazon RDS PostgreSQL provides a fully managed PostgreSQL database with automated failover, backups, and patching. PostgreSQL is widely used for complex queries, JSON data, and applications requiring advanced database features like full-text search and window functions.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS permissions

## Step 1: Set Up Networking and Security

```hcl
resource "aws_db_subnet_group" "postgres" {
  name       = "${var.project_name}-postgres-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "postgres-subnet-group" }
}

resource "aws_security_group" "postgres" {
  name   = "${var.project_name}-postgres-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "PostgreSQL from app servers"
  }
}
```

## Step 2: Store Password in Secrets Manager

```hcl
resource "random_password" "postgres" {
  length  = 32
  special = false  # Avoid characters disallowed by RDS master password rules
}

resource "aws_secretsmanager_secret" "postgres" {
  name                    = "${var.project_name}/rds/postgres/credentials"
  description             = "RDS PostgreSQL credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "postgres" {
  secret_id = aws_secretsmanager_secret.postgres.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.postgres.result
    engine   = "postgres"
    host     = aws_db_instance.postgres.address
    port     = 5432
    dbname   = var.database_name
  })
}
```

## Step 3: Create PostgreSQL Parameter Group

```hcl
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project_name}-postgres-params"
  family = "postgres16"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries slower than 1 second (ms)
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_connections"
    value        = "200"
    apply_method = "pending-reboot"
  }
}
```

## Step 4: Create the PostgreSQL Instance

```hcl
resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-postgres"
  engine         = "postgres"
  engine_version = "16"

  auto_minor_version_upgrade = true

  instance_class        = var.instance_class
  storage_type          = "gp3"
  allocated_storage     = 100
  max_allocated_storage = 1000

  db_name  = var.database_name
  username = var.master_username
  password = random_password.postgres.result

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  multi_az          = true
  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  # Enable IAM authentication
  iam_database_authentication_enabled = true

  backup_retention_period   = 14
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-postgres-final"
  copy_tags_to_snapshot     = true

  monitoring_interval = 60
  monitoring_role_arn = var.rds_monitoring_role_arn

  performance_insights_enabled          = true
  performance_insights_retention_period = 31  # days
  performance_insights_kms_key_id       = var.kms_key_arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "${var.project_name}-postgres"
    Engine      = "postgres-16"
    Environment = var.environment
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

This configuration creates a production-ready PostgreSQL RDS instance with all essential features: Multi-AZ, encryption, Secrets Manager for credentials, Performance Insights for query analysis, and IAM database authentication using temporary auth tokens. Create the `pg_stat_statements` extension in the database for detailed query statistics in Performance Insights.
