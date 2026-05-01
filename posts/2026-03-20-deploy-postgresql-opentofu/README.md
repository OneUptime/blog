# How to Deploy PostgreSQL on AWS RDS with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, PostgreSQL, RDS, AWS, Database, Infrastructure as Code

Description: Learn how to deploy a production-ready PostgreSQL database on AWS RDS using OpenTofu - including subnet groups, parameter groups, security groups, automated backups, and encryption.

## Introduction

Deploying PostgreSQL on AWS RDS with OpenTofu involves more than just the database instance. A production deployment requires a DB subnet group for multi-AZ placement, a parameter group for PostgreSQL settings, a security group with least-privilege access, and proper encryption and backup configuration.

## Subnet Group

```hcl
resource "aws_db_subnet_group" "postgres" {
  name        = "${var.environment}-postgres-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for PostgreSQL RDS"

  tags = {
    Name        = "${var.environment}-postgres-subnet-group"
    Environment = var.environment
  }
}
```

## Parameter Group

```hcl
resource "aws_db_parameter_group" "postgres15" {
  name        = "${var.environment}-postgres15"
  family      = "postgres15"
  description = "PostgreSQL 15 parameter group for ${var.environment}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking > 1 second
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  tags = { Environment = var.environment }
}
```

## Security Group

```hcl
resource "aws_security_group" "postgres" {
  name        = "${var.environment}-postgres-sg"
  description = "Security group for PostgreSQL RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.app_security_group_ids  # Only app servers
    description     = "PostgreSQL from application servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.environment}-postgres-sg" }
}
```

## RDS Instance

```hcl
resource "aws_db_instance" "postgres" {
  identifier = "${var.environment}-postgres"
  engine     = "postgres"
  engine_version = "15"  # Let RDS choose a current supported PostgreSQL 15 minor version

  instance_class     = var.db_instance_class  # "db.t3.medium"
  allocated_storage  = 100
  max_allocated_storage = 500  # Enable storage autoscaling to 500 GB
  storage_type       = "gp3"
  storage_encrypted  = true
  kms_key_id         = aws_kms_key.rds.arn

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password  # Stored in state; use password_wo on OpenTofu 1.11+ to avoid that

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  parameter_group_name   = aws_db_parameter_group.postgres15.name
  vpc_security_group_ids = [aws_security_group.postgres.id]

  # High availability
  multi_az = var.environment == "prod"

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"   # UTC
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Protection
  deletion_protection     = var.environment == "prod"
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.environment}-postgres-final" : null

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  publicly_accessible = false

  tags = {
    Name        = "${var.environment}-postgres"
    Environment = var.environment
  }
}
```

## KMS Key for Encryption

```hcl
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = { Environment = var.environment }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}
```

## Outputs

```hcl
output "db_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "PostgreSQL connection endpoint (host:port)"
}

output "db_name" {
  value = aws_db_instance.postgres.db_name
}

output "db_port" {
  value = aws_db_instance.postgres.port
}

output "db_security_group_id" {
  value = aws_security_group.postgres.id
}
```

## Secret Management for Password

```hcl
# Store password in AWS Secrets Manager

resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.environment}/postgres/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.postgres.username
    password = var.db_password
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    dbname   = aws_db_instance.postgres.db_name
  })
}
```

## Conclusion

A production PostgreSQL deployment on AWS RDS requires subnet groups for placement in private subnets, parameter groups for PostgreSQL configuration, security groups with least-privilege access, KMS encryption, automated backups with appropriate retention, and Multi-AZ for production availability. Store database credentials in AWS Secrets Manager rather than embedding them in application configs, but note that using `password` and `secret_string` here still stores the secret in OpenTofu state. Enable Performance Insights for query performance monitoring, and plan for CloudWatch Database Insights because the Performance Insights console experience reaches end-of-life on June 30, 2026. Enhanced Monitoring remains optional unless you need OS-level metrics.
