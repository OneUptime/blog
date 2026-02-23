# How to Use Dynamic Blocks for Database Parameter Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, RDS, Database, Parameter Groups, Infrastructure as Code

Description: Learn how to manage RDS and Aurora database parameter groups dynamically in Terraform using dynamic blocks for environment-specific tuning.

---

Database parameter groups in AWS RDS control engine-level settings like memory allocation, connection limits, logging, and query behavior. Different environments need different settings, and managing them across multiple databases gets repetitive. Dynamic blocks are the natural solution.

## Why Dynamic Blocks for Parameter Groups

A typical production PostgreSQL database might have 20 or more custom parameters. Staging might share most of them but with different values. Development might only need a handful. Writing separate `parameter` blocks for each combination is not practical.

## Basic Dynamic Parameter Group

Here is the standard pattern:

```hcl
variable "db_parameters" {
  description = "RDS parameter group settings"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = []
}

resource "aws_db_parameter_group" "main" {
  name        = "custom-postgres15"
  family      = "postgres15"
  description = "Custom parameter group for PostgreSQL 15"

  dynamic "parameter" {
    for_each = var.db_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "custom-postgres15"
    Environment = var.environment
  }
}
```

## Environment-Specific Parameters

Define different parameter sets per environment:

```hcl
# terraform.tfvars for production
db_parameters = [
  {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"  # 25% of instance memory
  },
  {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"  # 75% of instance memory
  },
  {
    name  = "work_mem"
    value = "65536"  # 64MB
  },
  {
    name  = "maintenance_work_mem"
    value = "524288"  # 512MB
  },
  {
    name  = "max_connections"
    value = "500"
  },
  {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries over 1 second
  },
  {
    name  = "log_statement"
    value = "ddl"  # Log DDL statements
  },
  {
    name         = "max_wal_size"
    value        = "4096"  # 4GB
    apply_method = "pending-reboot"  # Requires reboot
  },
  {
    name  = "random_page_cost"
    value = "1.1"  # SSD-optimized
  },
  {
    name  = "effective_io_concurrency"
    value = "200"  # SSD-optimized
  }
]
```

```hcl
# terraform.tfvars for development
db_parameters = [
  {
    name  = "max_connections"
    value = "100"
  },
  {
    name  = "log_min_duration_statement"
    value = "500"  # Log queries over 500ms - more aggressive for debugging
  },
  {
    name  = "log_statement"
    value = "all"  # Log everything in dev
  }
]
```

## Using Locals for Parameter Composition

Merge base parameters with environment-specific overrides:

```hcl
variable "environment" {
  type = string
}

locals {
  # Base parameters shared across all environments
  base_parameters = {
    "log_statement"            = "ddl"
    "log_min_duration_statement" = "1000"
    "random_page_cost"         = "1.1"
    "effective_io_concurrency"  = "200"
    "idle_in_transaction_session_timeout" = "300000"  # 5 minutes
  }

  # Environment-specific overrides
  env_parameters = {
    production = {
      "shared_buffers"           = "{DBInstanceClassMemory/4}"
      "effective_cache_size"     = "{DBInstanceClassMemory*3/4}"
      "max_connections"          = "500"
      "work_mem"                 = "65536"
      "maintenance_work_mem"     = "524288"
      "log_min_duration_statement" = "2000"  # Only slow queries in prod
    }
    staging = {
      "shared_buffers"           = "{DBInstanceClassMemory/4}"
      "max_connections"          = "200"
      "work_mem"                 = "32768"
      "log_min_duration_statement" = "1000"
    }
    development = {
      "max_connections"          = "100"
      "log_statement"            = "all"
      "log_min_duration_statement" = "0"  # Log everything
    }
  }

  # Merge: environment params override base params
  merged_parameters = merge(
    local.base_parameters,
    lookup(local.env_parameters, var.environment, {})
  )

  # Convert map to the list format expected by the dynamic block
  parameter_list = [
    for name, value in local.merged_parameters : {
      name         = name
      value        = value
      apply_method = contains(["shared_buffers", "max_connections", "max_wal_size"], name) ? "pending-reboot" : "immediate"
    }
  ]
}

resource "aws_db_parameter_group" "main" {
  name        = "${var.environment}-postgres15"
  family      = "postgres15"
  description = "Parameter group for ${var.environment}"

  dynamic "parameter" {
    for_each = local.parameter_list
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Aurora Cluster Parameter Groups

Aurora has two levels of parameter groups - cluster-level and instance-level. Both benefit from dynamic blocks:

```hcl
variable "cluster_parameters" {
  description = "Aurora cluster parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = [
    {
      name  = "server_audit_logging"
      value = "1"
    },
    {
      name  = "server_audit_events"
      value = "CONNECT,QUERY,QUERY_DCL,QUERY_DDL,QUERY_DML"
    }
  ]
}

variable "instance_parameters" {
  description = "Aurora instance parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = [
    {
      name  = "log_output"
      value = "FILE"
    },
    {
      name  = "slow_query_log"
      value = "1"
    },
    {
      name  = "long_query_time"
      value = "2"
    }
  ]
}

# Cluster parameter group
resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${var.environment}-aurora-cluster"
  family      = "aurora-mysql8.0"
  description = "Aurora cluster parameters for ${var.environment}"

  dynamic "parameter" {
    for_each = var.cluster_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }
}

# Instance parameter group
resource "aws_db_parameter_group" "aurora_instance" {
  name        = "${var.environment}-aurora-instance"
  family      = "aurora-mysql8.0"
  description = "Aurora instance parameters for ${var.environment}"

  dynamic "parameter" {
    for_each = var.instance_parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }
}
```

## Multiple Databases with Different Parameters

When you have several databases, each might need its own parameter group:

```hcl
variable "databases" {
  type = map(object({
    engine         = string
    engine_version = string
    family         = string
    instance_class = string
    parameters = list(object({
      name         = string
      value        = string
      apply_method = optional(string, "immediate")
    }))
  }))
}

# Create a parameter group for each database
resource "aws_db_parameter_group" "per_db" {
  for_each = var.databases

  name        = "${each.key}-params"
  family      = each.value.family
  description = "Parameters for ${each.key}"

  dynamic "parameter" {
    for_each = each.value.parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Create the databases referencing their parameter groups
resource "aws_db_instance" "main" {
  for_each = var.databases

  identifier     = each.key
  engine         = each.value.engine
  engine_version = each.value.engine_version
  instance_class = each.value.instance_class

  parameter_group_name = aws_db_parameter_group.per_db[each.key].name

  # ... other settings
}
```

## Static vs Dynamic Parameters

Some parameters should always be set regardless of input:

```hcl
locals {
  # Parameters that are always required
  mandatory_parameters = [
    {
      name         = "rds.force_ssl"
      value        = "1"  # Always enforce SSL
      apply_method = "pending-reboot"
    },
    {
      name         = "log_connections"
      value        = "1"  # Always log connections
      apply_method = "immediate"
    }
  ]

  # Combine mandatory with user-provided parameters
  all_parameters = concat(local.mandatory_parameters, var.db_parameters)
}
```

## Handling the apply_method Correctly

Some parameters require a reboot to take effect. Automatically determine the apply method:

```hcl
locals {
  # Parameters that require a reboot
  reboot_required_params = toset([
    "shared_buffers",
    "max_connections",
    "max_wal_size",
    "wal_buffers",
    "huge_pages",
    "shared_preload_libraries",
    "max_worker_processes"
  ])

  # Automatically set apply_method based on parameter name
  auto_parameters = [
    for param in var.db_parameters : {
      name         = param.name
      value        = param.value
      apply_method = contains(local.reboot_required_params, param.name) ? "pending-reboot" : "immediate"
    }
  ]
}
```

## Validation

Add validation to catch incorrect parameter configurations early:

```hcl
variable "db_parameters" {
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "immediate")
  }))

  validation {
    condition = alltrue([
      for p in var.db_parameters :
      contains(["immediate", "pending-reboot"], coalesce(p.apply_method, "immediate"))
    ])
    error_message = "apply_method must be either 'immediate' or 'pending-reboot'."
  }

  validation {
    condition = length(var.db_parameters) == length(distinct([for p in var.db_parameters : p.name]))
    error_message = "Duplicate parameter names are not allowed."
  }
}
```

## Summary

Database parameter groups are a textbook use case for dynamic blocks. The pattern is straightforward: define parameters as a list of name/value pairs, use locals to merge base and environment-specific settings, and generate parameter blocks dynamically. Pay attention to `apply_method` since some parameters require reboots, and use validation to catch configuration errors early. For more on environment-specific configuration, see [how to use dynamic blocks for setting multiple environment variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-setting-multiple-environment-variables/view).
