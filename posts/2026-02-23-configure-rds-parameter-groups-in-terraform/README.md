# How to Configure RDS Parameter Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Parameter Groups, Database Tuning

Description: A deep dive into creating and managing RDS parameter groups with Terraform, covering engine-specific tuning, apply methods, lifecycle management, and common configuration patterns.

---

Parameter groups are how you configure database engine settings on RDS. They control everything from memory allocation and connection limits to character sets and logging behavior. The default parameter group that RDS assigns works for basic testing, but any production workload will need customization.

In Terraform, parameter groups are their own resource type. This guide covers creating them, understanding the apply methods, dealing with lifecycle quirks, and practical tuning recommendations for the most common engines.

## What Are Parameter Groups

Every RDS instance has two types of parameter groups:

- **DB Parameter Group** - controls settings for a single instance (like `max_connections`, `shared_buffers`)
- **DB Cluster Parameter Group** - controls settings for an Aurora cluster (applies to all instances in the cluster)

Parameters can be either **static** or **dynamic**. Dynamic parameters take effect immediately when changed. Static parameters require a reboot of the instance before they take effect. This distinction matters a lot in Terraform.

## Creating a Basic Parameter Group

```hcl
# Custom parameter group for PostgreSQL 16
resource "aws_db_parameter_group" "postgres" {
  name        = "myapp-postgres16"
  family      = "postgres16"
  description = "Custom PostgreSQL 16 parameters for myapp"

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
    # Formula: 25% of instance memory
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
    # Log queries slower than 1 second
  }

  tags = {
    Name        = "myapp-postgres16"
    Environment = "production"
  }
}
```

The `family` must match your engine and major version. Common families include:

- `mysql8.0` for MySQL 8.0.x
- `postgres16` for PostgreSQL 16.x
- `mariadb10.11` for MariaDB 10.11.x
- `aurora-mysql8.0` for Aurora MySQL 8.0
- `aurora-postgresql16` for Aurora PostgreSQL 16

## Understanding Apply Methods

This is one of the trickiest parts of parameter groups in Terraform. Each parameter has an `apply_method` that tells RDS when to apply the change:

```hcl
resource "aws_db_parameter_group" "postgres" {
  name   = "myapp-postgres16"
  family = "postgres16"

  # Dynamic parameter - takes effect immediately
  parameter {
    name         = "log_min_duration_statement"
    value        = "1000"
    apply_method = "immediate"
  }

  # Static parameter - requires a reboot
  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  # If you don't specify apply_method, it defaults to "immediate"
  # This will FAIL for static parameters
  parameter {
    name  = "max_connections"
    value = "200"
    # max_connections is dynamic in PostgreSQL, so "immediate" is fine
  }
}
```

If you set `apply_method = "immediate"` on a static parameter, Terraform will apply the change but the database will not actually use the new value until the next reboot. This can lead to confusion where Terraform shows no pending changes, but the parameter is not actually in effect.

## Lifecycle Management

Parameter groups have a notorious lifecycle issue in Terraform. When you change the name, Terraform tries to destroy the old one and create a new one. But the old one is still attached to an RDS instance and cannot be deleted:

```hcl
resource "aws_db_parameter_group" "postgres" {
  # Use name_prefix instead of name to avoid conflicts during replacement
  name_prefix = "myapp-postgres16-"
  family      = "postgres16"

  # This ensures the new group is created before the old one is destroyed
  lifecycle {
    create_before_destroy = true
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }
}
```

Using `name_prefix` with `create_before_destroy` is the recommended pattern. Terraform will create a new parameter group with a unique suffix, attach it to the instance, and then delete the old one.

## MySQL 8.0 Parameter Group

Here is a production-ready MySQL parameter group with common tuning:

```hcl
resource "aws_db_parameter_group" "mysql" {
  name_prefix = "myapp-mysql80-"
  family      = "mysql8.0"
  description = "Tuned MySQL 8.0 parameters"

  # Character set - use utf8mb4 for full Unicode
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_0900_ai_ci"
  }

  # InnoDB tuning
  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"
    # 75% of memory for buffer pool
  }

  parameter {
    name         = "innodb_buffer_pool_instances"
    value        = "8"
    apply_method = "pending-reboot"
    # Static parameter - needs reboot
  }

  parameter {
    name  = "innodb_log_file_size"
    value = "268435456"
    # 256MB - larger log files improve write performance
  }

  parameter {
    name  = "innodb_flush_log_at_trx_commit"
    value = "1"
    # Full ACID compliance - set to 2 for better performance if you accept risk
  }

  parameter {
    name  = "innodb_io_capacity"
    value = "3000"
    # Match your storage IOPS
  }

  # Query tuning
  parameter {
    name  = "join_buffer_size"
    value = "262144"
    # 256KB
  }

  parameter {
    name  = "sort_buffer_size"
    value = "524288"
    # 512KB
  }

  # Slow query log
  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  # Connection limits
  parameter {
    name  = "max_connections"
    value = "300"
  }

  parameter {
    name  = "wait_timeout"
    value = "28800"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "myapp-mysql80"
  }
}
```

## PostgreSQL 16 Parameter Group

```hcl
resource "aws_db_parameter_group" "postgres16" {
  name_prefix = "myapp-pg16-"
  family      = "postgres16"
  description = "Tuned PostgreSQL 16 parameters"

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
    # 64MB - be careful, this is per-sort-operation, not per-connection
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"
    # 512MB for VACUUM, CREATE INDEX
  }

  # WAL settings
  parameter {
    name  = "wal_buffers"
    value = "16384"
    # 16MB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  # Planner settings for SSD storage
  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }

  # Extensions (static - needs reboot)
  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements,pg_cron"
    apply_method = "pending-reboot"
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
    # Log all DDL statements
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "myapp-pg16"
  }
}
```

## Using Formulas

RDS supports formula-based parameter values that scale with the instance class. This is powerful because you can use the same parameter group across different instance sizes:

```hcl
# These formulas are evaluated by RDS, not Terraform
parameter {
  name  = "shared_buffers"
  value = "{DBInstanceClassMemory/4}"
  # Evaluates to 25% of instance memory
}

parameter {
  name  = "innodb_buffer_pool_size"
  value = "{DBInstanceClassMemory*3/4}"
  # Evaluates to 75% of instance memory
}
```

Available variables in formulas:
- `{DBInstanceClassMemory}` - total memory in bytes
- `{DBInstanceClassHugePagesMemory}` - memory allocated for huge pages

## Attaching to an RDS Instance

Wire the parameter group into your instance:

```hcl
resource "aws_db_instance" "main" {
  identifier           = "myapp-db"
  engine               = "postgres"
  engine_version       = "16.2"
  instance_class       = "db.r6g.large"
  parameter_group_name = aws_db_parameter_group.postgres16.name

  # ... rest of configuration
}
```

When you change a parameter group and apply, RDS will show the instance status as "applying" or "pending-reboot" depending on whether the changed parameters are dynamic or static.

## Comparing Current vs Desired Parameters

Sometimes you want to verify what parameters are actually in effect. You can check this via the AWS CLI:

```bash
# See all non-default parameters in a group
aws rds describe-db-parameters \
  --db-parameter-group-name myapp-pg16-abc123 \
  --query "Parameters[?Source=='user'].[ParameterName,ParameterValue,ApplyMethod,IsModifiable]" \
  --output table
```

## Summary

Parameter groups are essential for tuning RDS databases beyond their defaults. The key things to remember are: use `name_prefix` with `create_before_destroy` for smooth updates, set `apply_method = "pending-reboot"` for static parameters, use RDS formulas so your parameters scale with instance size, and always test parameter changes in a non-production environment first. Getting these settings right has a direct impact on your database performance and reliability.
