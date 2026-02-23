# How to Create RDS with Custom Parameter Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Parameter Groups, Database, Infrastructure as Code

Description: Learn how to create RDS instances with custom parameter groups in Terraform for fine-tuned database configuration including performance tuning and security hardening.

---

RDS parameter groups control the configuration of your database engine. While the default parameter groups work for basic setups, production databases almost always require custom tuning for performance, security, and compliance. With Terraform, you can define these configurations as code and apply them consistently across environments. This guide covers creating and managing RDS parameter groups for MySQL, PostgreSQL, and other engines.

## Why Custom Parameter Groups?

Default parameter groups cannot be modified. If you need to change any database engine parameter - buffer sizes, connection limits, logging settings, character sets, or security settings - you need a custom parameter group. Custom parameter groups also enable version-controlled database configuration and consistent settings across development, staging, and production environments.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with private subnets. Familiarity with database engine parameters is helpful but not required.

## MySQL Custom Parameter Group

```hcl
provider "aws" {
  region = "us-east-1"
}

# Custom parameter group for MySQL 8.0
resource "aws_db_parameter_group" "mysql" {
  name        = "custom-mysql80"
  family      = "mysql8.0"  # Must match the engine version
  description = "Custom parameter group for MySQL 8.0 production workloads"

  # Performance tuning parameters
  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"  # Use 75% of instance memory
  }

  parameter {
    name  = "innodb_log_file_size"
    value = "1073741824"  # 1 GB log files for write-heavy workloads
  }

  parameter {
    name  = "innodb_flush_log_at_trx_commit"
    value = "1"  # Full ACID compliance (1 = safest, 2 = better performance)
  }

  parameter {
    name  = "innodb_io_capacity"
    value = "2000"  # Higher for SSD-backed instances
  }

  parameter {
    name  = "innodb_io_capacity_max"
    value = "4000"
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "500"  # Adjust based on instance size
  }

  parameter {
    name  = "wait_timeout"
    value = "300"  # Close idle connections after 5 minutes
  }

  parameter {
    name  = "interactive_timeout"
    value = "300"
  }

  # Logging parameters
  parameter {
    name  = "slow_query_log"
    value = "1"  # Enable slow query logging
  }

  parameter {
    name  = "long_query_time"
    value = "2"  # Log queries taking more than 2 seconds
  }

  parameter {
    name  = "log_output"
    value = "FILE"  # Write logs to files (viewable via CloudWatch)
  }

  parameter {
    name  = "general_log"
    value = "0"  # Disable general log in production (performance impact)
  }

  # Character set and collation
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  # Security parameters
  parameter {
    name  = "require_secure_transport"
    value = "1"  # Require SSL connections
  }

  parameter {
    name  = "local_infile"
    value = "0"  # Disable LOAD DATA LOCAL for security
  }

  tags = {
    Name        = "mysql-custom-params"
    Environment = "production"
  }

  lifecycle {
    create_before_destroy = true  # Prevent downtime during parameter group changes
  }
}
```

## PostgreSQL Custom Parameter Group

```hcl
# Custom parameter group for PostgreSQL 15
resource "aws_db_parameter_group" "postgresql" {
  name        = "custom-postgres15"
  family      = "postgres15"
  description = "Custom parameter group for PostgreSQL 15 production workloads"

  # Memory and performance
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"  # 25% of instance memory (PostgreSQL convention)
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
  }

  parameter {
    name  = "work_mem"
    value = "65536"  # 64 MB per operation (be careful - multiplied by connections)
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"  # 512 MB for maintenance operations
  }

  # WAL settings for write performance
  parameter {
    name  = "wal_buffers"
    value = "65536"  # 64 MB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "max_wal_size"
    value = "4096"  # 4 GB max WAL size
  }

  # Query planning
  parameter {
    name  = "random_page_cost"
    value = "1.1"  # Lower for SSD storage (default 4.0 is for HDDs)
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"  # Higher for SSD
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "idle_in_transaction_session_timeout"
    value = "300000"  # 5 minutes in milliseconds
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "2000"  # Log queries taking more than 2 seconds
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"  # Log DDL statements
  }

  # Security
  parameter {
    name  = "ssl"
    value = "1"
    apply_method = "pending-reboot"  # Requires restart
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"  # Force all connections to use SSL
  }

  tags = {
    Name        = "postgresql-custom-params"
    Environment = "production"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## RDS Instance with Custom Parameter Group

```hcl
# Subnet group for RDS
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "main-db-subnet-group"
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for RDS instances"

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "MySQL from application tier"
  }

  tags = {
    Name = "rds-sg"
  }
}

# RDS MySQL instance with custom parameter group
resource "aws_db_instance" "mysql" {
  identifier     = "production-mysql"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500  # Enable storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "admin"
  password = var.db_password

  # Use our custom parameter group
  parameter_group_name = aws_db_parameter_group.mysql.name

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Apply parameter changes immediately (use with caution in production)
  apply_immediately = false

  tags = {
    Name        = "production-mysql"
    Environment = "production"
  }
}

variable "db_password" {
  description = "Database admin password"
  type        = string
  sensitive   = true
}
```

## Dynamic Parameters with Variables

Make parameter groups configurable across environments.

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_max_connections" {
  description = "Maximum database connections"
  type        = number
  default     = 500
}

variable "slow_query_threshold" {
  description = "Slow query log threshold in seconds"
  type        = number
  default     = 2
}

locals {
  # Environment-specific parameter overrides
  env_params = {
    production = {
      max_connections     = 500
      slow_query_log      = "1"
      long_query_time     = "2"
      general_log         = "0"
      require_ssl         = "1"
    }
    staging = {
      max_connections     = 200
      slow_query_log      = "1"
      long_query_time     = "1"
      general_log         = "0"
      require_ssl         = "1"
    }
    development = {
      max_connections     = 100
      slow_query_log      = "1"
      long_query_time     = "0.5"
      general_log         = "1"  # Enable in dev for debugging
      require_ssl         = "0"  # Relaxed in dev
    }
  }
}

resource "aws_db_parameter_group" "env_specific" {
  name        = "${var.environment}-mysql80"
  family      = "mysql8.0"
  description = "MySQL 8.0 params for ${var.environment}"

  parameter {
    name  = "max_connections"
    value = local.env_params[var.environment].max_connections
  }

  parameter {
    name  = "slow_query_log"
    value = local.env_params[var.environment].slow_query_log
  }

  parameter {
    name  = "long_query_time"
    value = local.env_params[var.environment].long_query_time
  }

  parameter {
    name  = "general_log"
    value = local.env_params[var.environment].general_log
  }

  parameter {
    name  = "require_secure_transport"
    value = local.env_params[var.environment].require_ssl
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = var.environment
  }
}
```

## Handling Parameter Changes

Some parameters require a reboot to take effect. Use the `apply_method` attribute to control this.

```hcl
resource "aws_db_parameter_group" "with_reboot" {
  name   = "params-with-reboot"
  family = "mysql8.0"

  # Static parameter - requires reboot
  parameter {
    name         = "innodb_log_file_size"
    value        = "1073741824"
    apply_method = "pending-reboot"  # Applied at next maintenance window or manual reboot
  }

  # Dynamic parameter - applied immediately
  parameter {
    name         = "max_connections"
    value        = "500"
    apply_method = "immediate"  # Applied without reboot
  }
}
```

## Conclusion

Custom parameter groups are essential for production RDS deployments. They allow you to tune performance, enable proper logging, enforce security settings, and maintain consistency across environments. With Terraform, these configurations become version-controlled, reviewable, and reproducible.

For more RDS configurations, check out our guide on [How to Create RDS with Option Groups in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rds-with-option-groups-in-terraform/view).
