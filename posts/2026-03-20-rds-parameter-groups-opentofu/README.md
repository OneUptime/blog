# How to Configure RDS Parameter Groups with OpenTofu - Rds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Parameter Group, Database Tuning, Infrastructure as Code, Performance

Description: Learn how to create and manage RDS parameter groups using OpenTofu to customize database engine settings for performance, logging, and compliance requirements.

## Introduction

RDS parameter groups configure database engine settings like memory allocation, connection limits, and logging behavior. Custom parameter groups let you tune databases beyond the conservative AWS defaults, enabling better performance for your specific workload patterns.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS permissions

## Step 1: Create a PostgreSQL Parameter Group

```hcl
# Parameter group for PostgreSQL 16 with production tuning

resource "aws_db_parameter_group" "postgres_prod" {
  name        = "${var.project_name}-postgres16-prod"
  family      = "postgres16"
  description = "Production PostgreSQL 16 parameter group"

  # Enable detailed query logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries > 1 second (milliseconds)
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  # Performance settings
  parameter {
    name         = "max_connections"
    value        = "400"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "work_mem"
    value = "16384"  # 16 MB per sort operation
    apply_method = "immediate"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements,auto_explain"
    apply_method = "pending-reboot"
  }

  # Security
  parameter {
    name  = "ssl"
    value = "1"  # Require SSL connections
  }

  tags = {
    Name        = "postgres16-prod"
    Engine      = "postgres16"
    Environment = var.environment
  }
}
```

## Step 2: Create a MySQL Parameter Group

```hcl
resource "aws_db_parameter_group" "mysql_prod" {
  name   = "${var.project_name}-mysql80-prod"
  family = "mysql8.0"

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "1"  # Log queries > 1 second
  }

  parameter {
    name  = "general_log"
    value = "0"  # Disable general log in production (verbose)
  }

  parameter {
    name         = "innodb_buffer_pool_size"
    value        = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "max_connections"
    value = "300"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  tags = { Name = "mysql80-prod" }
}
```

## Step 3: Apply Parameter Group to RDS Instance

```hcl
resource "aws_db_instance" "main" {
  identifier   = "${var.project_name}-db"
  engine       = "postgres"
  instance_class = "db.r6g.xlarge"

  # Apply the custom parameter group
  parameter_group_name = aws_db_parameter_group.postgres_prod.name

  # Other configuration...
  engine_version = "16.2"
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password
  storage_type      = "gp3"
  allocated_storage = 100

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]
}
```

## Step 4: Handle Pending Reboot Parameters

```hcl
# CloudWatch alarm to detect when a parameter requires reboot
resource "aws_cloudwatch_metric_alarm" "pending_reboot" {
  alarm_name          = "${var.project_name}-rds-pending-reboot"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0

  # Use this as a reminder to schedule maintenance
  alarm_description = "Check for pending RDS parameter group changes requiring reboot"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check for parameters pending reboot
aws rds describe-db-instances \
  --db-instance-identifier my-project-db \
  --query 'DBInstances[0].DBParameterGroups'
```

## Conclusion

Custom parameter groups are essential for production database performance tuning. Parameters with `apply_method = "pending-reboot"` require a database restart to take effect-plan these changes during maintenance windows. Use `{DBInstanceClassMemory}` formula parameters for settings that should scale with instance size, making your parameter group reusable across different instance types.
