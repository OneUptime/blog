# How to Handle Large Database Parameters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Parameters, RDS, Aurora, Performance Tuning, Infrastructure as Code

Description: Learn how to manage and tune large sets of database parameters using Terraform for RDS, Aurora, ElastiCache, and other AWS database services effectively.

---

Database parameter groups control the behavior and performance characteristics of your database engines. As your workload grows, you will need to tune these parameters to optimize performance, manage memory, configure logging, and adjust replication settings. Managing large sets of parameters in Terraform requires organization, documentation, and a clear strategy. In this guide, we will cover how to handle database parameters effectively across AWS database services using Terraform.

## Understanding Database Parameters

Database parameters are configuration settings that control how your database engine operates. For PostgreSQL, examples include `shared_buffers`, `work_mem`, `max_connections`, and `effective_cache_size`. For MySQL, they include `innodb_buffer_pool_size`, `max_connections`, `query_cache_size`, and `log_bin_trust_function_creators`. Each parameter affects performance, behavior, or both.

Parameters fall into two categories: dynamic parameters that can be changed without a restart, and static parameters that require a database restart to take effect. When you modify a static parameter in Terraform, the change will be pending until the next maintenance window or until you trigger a restart.

## Setting Up the Provider

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a PostgreSQL Parameter Group

```hcl
# Comprehensive PostgreSQL parameter group
resource "aws_db_parameter_group" "postgres_production" {
  name        = "postgres-production-params"
  family      = "postgres15"
  description = "Production-optimized PostgreSQL 15 parameters"

  # Memory settings
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"  # 25% of instance memory
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
  }

  parameter {
    name  = "work_mem"
    value = "65536"  # 64 MB per sort/hash operation
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"  # 512 MB for maintenance operations
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  # WAL and checkpoint settings
  parameter {
    name  = "wal_buffers"
    value = "16384"  # 16 MB
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "max_wal_size"
    value = "4096"  # 4 GB
  }

  parameter {
    name  = "min_wal_size"
    value = "1024"  # 1 GB
  }

  # Query planner settings
  parameter {
    name  = "random_page_cost"
    value = "1.1"  # Lower for SSD storage
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"  # Higher for SSD storage
  }

  # Logging settings
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries slower than 1 second
  }

  parameter {
    name  = "log_statement"
    value = "ddl"  # Log DDL statements
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
    name  = "log_temp_files"
    value = "0"  # Log all temp file creation
  }

  # Security settings
  parameter {
    name  = "rds.force_ssl"
    value = "1"  # Force SSL connections
  }

  # Extensions
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
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

  # auto_explain configuration
  parameter {
    name  = "auto_explain.log_min_duration"
    value = "5000"  # Log explain plans for queries > 5 seconds
  }

  parameter {
    name  = "auto_explain.log_analyze"
    value = "1"
  }

  # Parallel query settings
  parameter {
    name  = "max_parallel_workers_per_gather"
    value = "4"
  }

  parameter {
    name  = "max_parallel_workers"
    value = "8"
  }

  parameter {
    name  = "max_parallel_maintenance_workers"
    value = "4"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Purpose     = "performance-tuning"
  }
}
```

## Using Variables for Parameter Management

When you have many parameters, organizing them with variables makes the configuration more manageable:

```hcl
# Define parameters as a variable for easier management
variable "postgres_parameters" {
  description = "PostgreSQL parameters for the production environment"
  type = map(object({
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = {
    # Memory
    "shared_buffers"         = { value = "{DBInstanceClassMemory/4}" }
    "effective_cache_size"   = { value = "{DBInstanceClassMemory*3/4}" }
    "work_mem"               = { value = "65536" }
    "maintenance_work_mem"   = { value = "524288" }

    # Connections
    "max_connections" = { value = "200", apply_method = "pending-reboot" }

    # WAL
    "wal_buffers"                   = { value = "16384" }
    "checkpoint_completion_target"  = { value = "0.9" }
    "max_wal_size"                  = { value = "4096" }

    # Planner
    "random_page_cost"         = { value = "1.1" }
    "effective_io_concurrency"  = { value = "200" }

    # Logging
    "log_min_duration_statement" = { value = "1000" }
    "log_statement"              = { value = "ddl" }
    "log_connections"            = { value = "1" }
    "log_disconnections"         = { value = "1" }

    # Security
    "rds.force_ssl" = { value = "1" }

    # Extensions
    "shared_preload_libraries" = { value = "pg_stat_statements", apply_method = "pending-reboot" }
    "pg_stat_statements.track" = { value = "all" }
    "pg_stat_statements.max"   = { value = "10000" }
  }
}

# Create parameter group using dynamic blocks
resource "aws_db_parameter_group" "dynamic_params" {
  name        = "postgres-dynamic-params"
  family      = "postgres15"
  description = "Dynamically configured PostgreSQL parameters"

  dynamic "parameter" {
    for_each = var.postgres_parameters
    content {
      name         = parameter.key
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Creating MySQL Parameter Groups

```hcl
# MySQL production parameter group
variable "mysql_parameters" {
  description = "MySQL parameters"
  type        = map(string)
  default = {
    # InnoDB settings
    "innodb_buffer_pool_size"        = "{DBInstanceClassMemory*3/4}"
    "innodb_log_file_size"           = "536870912"  # 512 MB
    "innodb_flush_log_at_trx_commit" = "1"
    "innodb_flush_method"            = "O_DIRECT"
    "innodb_file_per_table"          = "1"
    "innodb_io_capacity"             = "2000"
    "innodb_io_capacity_max"         = "4000"
    "innodb_read_io_threads"         = "16"
    "innodb_write_io_threads"        = "16"

    # Connection settings
    "max_connections"         = "200"
    "max_allowed_packet"      = "67108864"  # 64 MB
    "wait_timeout"            = "28800"
    "interactive_timeout"     = "28800"

    # Query cache (disabled in MySQL 8.0+)
    "table_open_cache"       = "4000"
    "table_definition_cache" = "2000"

    # Logging
    "slow_query_log"         = "1"
    "long_query_time"        = "1"
    "log_output"             = "FILE"

    # Security
    "require_secure_transport" = "ON"

    # Performance schema
    "performance_schema" = "1"
  }
}

resource "aws_db_parameter_group" "mysql_production" {
  name        = "mysql-production-params"
  family      = "mysql8.0"
  description = "Production-optimized MySQL 8.0 parameters"

  dynamic "parameter" {
    for_each = var.mysql_parameters
    content {
      name  = parameter.key
      value = parameter.value
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Aurora Cluster and Instance Parameter Groups

Aurora uses both cluster-level and instance-level parameter groups:

```hcl
# Aurora PostgreSQL cluster parameter group
resource "aws_rds_cluster_parameter_group" "aurora_cluster" {
  name        = "aurora-pg-cluster-params"
  family      = "aurora-postgresql15"
  description = "Aurora PostgreSQL cluster parameters"

  # Cluster-level parameters
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "auto_explain.log_min_duration"
    value = "5000"
  }

  tags = {
    Environment = "production"
    Level       = "cluster"
  }
}

# Aurora PostgreSQL instance parameter group
resource "aws_db_parameter_group" "aurora_instance" {
  name        = "aurora-pg-instance-params"
  family      = "aurora-postgresql15"
  description = "Aurora PostgreSQL instance parameters"

  # Instance-level parameters
  parameter {
    name  = "work_mem"
    value = "65536"
  }

  parameter {
    name  = "max_parallel_workers_per_gather"
    value = "4"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = {
    Environment = "production"
    Level       = "instance"
  }
}
```

## ElastiCache Redis Parameters

```hcl
# Redis parameter group with comprehensive settings
resource "aws_elasticache_parameter_group" "redis_production" {
  name        = "redis-production-params"
  family      = "redis7"
  description = "Production Redis 7 parameters"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"  # Evict keys with TTL using LRU
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # More samples for better LRU approximation
  }

  # Persistence (if needed alongside ElastiCache backups)
  parameter {
    name  = "appendonly"
    value = "no"  # Typically disabled for ElastiCache
  }

  # Performance
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "timeout"
    value = "0"  # No client timeout
  }

  parameter {
    name  = "hz"
    value = "25"  # Background task frequency
  }

  # Keyspace notifications
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Notify on expired events
  }

  # Slow log
  parameter {
    name  = "slowlog-log-slower-than"
    value = "10000"  # Log commands slower than 10ms
  }

  parameter {
    name  = "slowlog-max-len"
    value = "128"
  }

  # Active defragmentation
  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "active-defrag-threshold-lower"
    value = "10"  # Start defrag when fragmentation exceeds 10%
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Environment-Specific Parameters

Different environments need different parameter values:

```hcl
# Environment-specific parameter configurations
locals {
  environment_params = {
    production = {
      max_connections          = "200"
      shared_buffers          = "{DBInstanceClassMemory/4}"
      work_mem                = "65536"
      log_min_duration_statement = "1000"
      log_statement           = "ddl"
    }
    staging = {
      max_connections          = "100"
      shared_buffers          = "{DBInstanceClassMemory/4}"
      work_mem                = "32768"
      log_min_duration_statement = "500"
      log_statement           = "all"  # More verbose logging in staging
    }
    development = {
      max_connections          = "50"
      shared_buffers          = "{DBInstanceClassMemory/4}"
      work_mem                = "16384"
      log_min_duration_statement = "0"  # Log all queries in dev
      log_statement           = "all"
    }
  }
}

resource "aws_db_parameter_group" "env_params" {
  name        = "${var.environment}-postgres-params"
  family      = "postgres15"
  description = "PostgreSQL parameters for ${var.environment}"

  dynamic "parameter" {
    for_each = local.environment_params[var.environment]
    content {
      name  = parameter.key
      value = parameter.value
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}
```

## Using a Module for Parameter Group Management

```hcl
# modules/db-parameter-group/variables.tf
variable "name" {
  description = "Name of the parameter group"
  type        = string
}

variable "family" {
  description = "Database engine family"
  type        = string
}

variable "description" {
  description = "Description of the parameter group"
  type        = string
}

variable "parameters" {
  description = "Map of parameters to set"
  type = map(object({
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = {}
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}

# modules/db-parameter-group/main.tf
resource "aws_db_parameter_group" "this" {
  name        = var.name
  family      = var.family
  description = var.description

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name         = parameter.key
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  tags = var.tags
}

# modules/db-parameter-group/outputs.tf
output "name" {
  value = aws_db_parameter_group.this.name
}

output "arn" {
  value = aws_db_parameter_group.this.arn
}
```

## Handling Parameter Changes Safely

Some parameter changes require a reboot. Handle this carefully:

```hcl
# Use apply_method to control when changes take effect
resource "aws_db_parameter_group" "safe_params" {
  name   = "safe-postgres-params"
  family = "postgres15"

  # Dynamic parameters - applied immediately
  parameter {
    name         = "work_mem"
    value        = "65536"
    apply_method = "immediate"
  }

  parameter {
    name         = "log_min_duration_statement"
    value        = "1000"
    apply_method = "immediate"
  }

  # Static parameters - applied on next reboot
  parameter {
    name         = "max_connections"
    value        = "200"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  tags = {
    Environment = "production"
  }
}
```

## Documenting Parameters

Use comments and tags to document why parameters are set to specific values:

```hcl
# Well-documented parameter group
resource "aws_db_parameter_group" "documented_params" {
  name        = "documented-postgres-params"
  family      = "postgres15"
  description = "PostgreSQL params - last reviewed 2026-02-23"

  # MEMORY: Set shared_buffers to 25% of instance RAM
  # Rationale: PostgreSQL recommendation for dedicated DB servers
  # Instance: db.r6g.large (16 GB RAM) = 4 GB shared_buffers
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  # MEMORY: work_mem controls per-sort/hash operation memory
  # Rationale: 64 MB allows complex sorts without temp files
  # Monitor: Check temp_files metric to validate
  parameter {
    name  = "work_mem"
    value = "65536"
  }

  # LOGGING: Log queries slower than 1 second
  # Rationale: Helps identify slow queries for optimization
  # Review threshold quarterly based on p99 query times
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Environment = "production"
    LastReviewed = "2026-02-23"
    ReviewedBy   = "dba-team"
  }
}
```

## Monitoring Parameter Effects

After changing parameters, monitor the impact:

```hcl
# Monitor key metrics that parameters affect
resource "aws_cloudwatch_metric_alarm" "after_param_change" {
  alarm_name          = "db-performance-after-param-change"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 6
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Monitor CPU after parameter changes"

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }

  alarm_actions = [aws_sns_topic.param_alerts.arn]
}

resource "aws_sns_topic" "param_alerts" {
  name = "db-parameter-change-alerts"
}

variable "db_instance_id" {
  type = string
}
```

For tracking the performance impact of parameter changes over time, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides dashboards that help you correlate parameter changes with performance metrics.

## Best Practices

Organize parameters logically by category (memory, connections, logging, security). Use variables and dynamic blocks for large parameter sets to keep your Terraform code clean. Always specify `apply_method` explicitly so you know which changes require a reboot. Document the rationale for non-default parameter values. Test parameter changes in staging before applying to production. Use environment-specific parameter configurations rather than one-size-fits-all settings. Review and update parameters quarterly as your workload evolves. Use RDS formula syntax like `{DBInstanceClassMemory/4}` for memory-relative settings so they scale automatically with instance size changes. Monitor performance metrics closely after any parameter change.

## Conclusion

Managing large sets of database parameters in Terraform requires organization and discipline. By using variables, dynamic blocks, modules, and clear documentation, you can maintain complex parameter configurations that are readable and maintainable. The key is treating parameter management as an ongoing process, reviewing and adjusting settings as your workload changes and grows.
