# How to Create RDS PostgreSQL Instance in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, PostgreSQL, Database, Infrastructure as Code

Description: A practical guide to creating and configuring an Amazon RDS PostgreSQL instance with Terraform, including PostgreSQL-specific parameter tuning and security best practices.

---

PostgreSQL has become the database of choice for many teams, and for good reason. It handles complex queries well, supports JSON natively, has excellent extension support, and the community is active. Running PostgreSQL on Amazon RDS gives you all those benefits without the operational overhead of managing replication, backups, and patching yourself.

This guide focuses specifically on PostgreSQL configuration in RDS with Terraform. We will cover the instance setup, PostgreSQL-specific parameter tuning, extension management, and the small details that make a real difference in production.

## Project Setup

Start with the provider configuration and some shared variables:

```hcl
# main.tf - Provider and backend configuration
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Security Group for PostgreSQL

PostgreSQL listens on port 5432 by default. Your security group should only allow connections from known sources:

```hcl
# Security group for PostgreSQL RDS
resource "aws_security_group" "postgres" {
  name_prefix = "postgres-rds-"
  vpc_id      = var.vpc_id
  description = "Controls access to the PostgreSQL RDS instance"

  # PostgreSQL port access from application servers
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "PostgreSQL from application servers"
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
    Name = "postgres-rds-sg"
  }
}
```

Using `security_groups` instead of `cidr_blocks` in the ingress rule is a better practice - it ties access to specific security groups rather than IP ranges that might change.

## Subnet Group

Place the database in private subnets across multiple AZs:

```hcl
# DB subnet group spanning multiple availability zones
resource "aws_db_subnet_group" "postgres" {
  name        = "postgres-db-subnets"
  description = "Subnet group for PostgreSQL RDS"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name = "postgres-db-subnets"
  }
}
```

## PostgreSQL Parameter Group

This is where PostgreSQL configuration gets interesting. The default parameters work, but tuning them for your workload can dramatically improve performance:

```hcl
# Custom parameter group for PostgreSQL 16
resource "aws_db_parameter_group" "postgres" {
  name        = "myapp-postgres16-params"
  family      = "postgres16"
  description = "Custom parameters for PostgreSQL 16"

  # Memory settings
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
    # 25% of instance memory - PostgreSQL recommendation
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
    # 75% of memory - tells the planner how much cache is available
  }

  parameter {
    name  = "work_mem"
    value = "65536"
    # 64MB per operation - increase for complex sorts/joins
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"
    # 512MB for VACUUM, CREATE INDEX, etc.
  }

  # WAL settings
  parameter {
    name  = "wal_buffers"
    value = "16384"
    # 16MB - good default for most workloads
  }

  # Query planning
  parameter {
    name  = "random_page_cost"
    value = "1.1"
    # Lower than default 4.0 because RDS uses SSDs
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
    # Higher for SSD storage
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
    # Log queries slower than 1 second
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name = "myapp-postgres16-params"
  }
}
```

## The PostgreSQL RDS Instance

Now for the main event. This creates a PostgreSQL 16 instance with all the supporting resources wired together:

```hcl
# Generate a secure random password
resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# The PostgreSQL RDS instance
resource "aws_db_instance" "postgres" {
  identifier = "myapp-postgres"

  # PostgreSQL engine configuration
  engine               = "postgres"
  engine_version       = "16.2"
  instance_class       = var.instance_class
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Storage
  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  iops                  = 3000   # gp3 baseline
  storage_throughput    = 125    # gp3 baseline in MB/s

  # Database credentials
  db_name  = "myapp"
  username = "app_admin"
  password = random_password.postgres.result
  port     = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  publicly_accessible    = false

  # Backup and maintenance
  backup_retention_period   = 14
  backup_window             = "02:00-03:00"
  maintenance_window        = "Sun:03:00-Sun:04:00"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true

  # Protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "myapp-postgres-final"

  # Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "myapp-postgres"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Enhanced Monitoring IAM Role

The `monitoring_interval` setting requires an IAM role that RDS can assume to push metrics:

```hcl
# IAM role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Managing PostgreSQL Extensions

One of PostgreSQL's biggest strengths is its extension system. On RDS, you enable extensions through the `shared_preload_libraries` parameter for those that need it, and then run `CREATE EXTENSION` within the database. Some common extensions:

```hcl
# Add to the parameter group for extensions requiring preloading
parameter {
  name         = "shared_preload_libraries"
  value        = "pg_stat_statements,pg_cron"
  apply_method = "pending-reboot"
  # This requires a reboot to take effect
}

# pg_stat_statements settings
parameter {
  name  = "pg_stat_statements.track"
  value = "all"
}

parameter {
  name  = "pg_stat_statements.max"
  value = "10000"
}
```

After the instance is up, you would connect and run:

```sql
-- Enable commonly used extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search
```

## Store Credentials in Secrets Manager

Keep your credentials out of Terraform state as much as possible:

```hcl
# Store the database credentials securely
resource "aws_secretsmanager_secret" "postgres" {
  name                    = "myapp/postgres/credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "postgres" {
  secret_id = aws_secretsmanager_secret.postgres.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    username = aws_db_instance.postgres.username
    password = random_password.postgres.result
    dbname   = aws_db_instance.postgres.db_name
  })
}
```

## Outputs

```hcl
output "postgres_endpoint" {
  description = "PostgreSQL connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "postgres_address" {
  description = "PostgreSQL hostname"
  value       = aws_db_instance.postgres.address
}

output "postgres_port" {
  value = aws_db_instance.postgres.port
}

output "credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.postgres.arn
}
```

## PostgreSQL vs MySQL on RDS - Quick Notes

If you are deciding between the two, PostgreSQL on RDS supports larger instance storage (up to 64TB vs 64TB for MySQL too, but PostgreSQL handles large datasets more gracefully with its MVCC implementation). PostgreSQL also supports more advanced data types like arrays, JSONB, and range types natively.

The trade-off is that PostgreSQL can use more memory per connection than MySQL, so connection pooling (using PgBouncer or RDS Proxy) becomes important sooner. If your application opens hundreds of connections, plan for RDS Proxy from the start.

## Applying and Verifying

```bash
# Initialize and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Verify the instance is available
aws rds describe-db-instances \
  --db-instance-identifier myapp-postgres \
  --query 'DBInstances[0].DBInstanceStatus'
```

The PostgreSQL instance will take 5-15 minutes to become available. Once it is up, test connectivity from your application subnet and verify the parameter group settings are applied by running `SHOW shared_buffers;` from a psql session.

## Summary

Setting up RDS PostgreSQL with Terraform gives you a repeatable process that captures all your database configuration decisions in code. The key PostgreSQL-specific considerations are tuning `shared_buffers` and `effective_cache_size`, enabling useful extensions through `shared_preload_libraries`, and planning for connection management early. With the configuration above, you have a solid foundation for a production PostgreSQL deployment.
