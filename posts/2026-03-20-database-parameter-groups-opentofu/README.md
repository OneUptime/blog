# How to Configure RDS Parameter Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Parameter Group, Database, Infrastructure as Code

Description: Learn how to create and apply custom RDS parameter groups using OpenTofu to tune database engine settings.

---

RDS parameter groups control the database engine configuration - connection limits, query caching, memory allocation, and hundreds of other settings. OpenTofu manages parameter groups as code, ensuring consistent database tuning across environments.

---

## Create a Parameter Group

```hcl
resource "aws_db_parameter_group" "postgres" {
  name        = "postgres15-custom"
  family      = "postgres15"
  description = "Custom PostgreSQL 15 parameter group"

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "shared_buffers"
    value = "262144"  # 2GB in 8KB pages
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries over 1 second
  }

  parameter {
    name  = "log_connections"
    value = "1"
    apply_method = "immediate"
  }

  tags = {
    Name = "postgres15-custom"
  }
}
```

---

## Apply to an RDS Instance

```hcl
resource "aws_db_instance" "main" {
  identifier            = "main-db"
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = "db.t3.medium"
  allocated_storage     = 50
  parameter_group_name  = aws_db_parameter_group.postgres.name

  # ... other settings
}
```

---

## Apply Methods

```hcl
parameter {
  name         = "max_connections"
  value        = "500"
  apply_method = "pending-reboot"  # Requires reboot to take effect
}

parameter {
  name         = "log_connections"
  value        = "1"
  apply_method = "immediate"  # Takes effect without reboot
}
```

---

## MySQL Parameter Group

```hcl
resource "aws_db_parameter_group" "mysql" {
  name   = "mysql80-custom"
  family = "mysql8.0"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

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

---

## Cluster Parameter Group for Aurora

```hcl
resource "aws_rds_cluster_parameter_group" "aurora_pg" {
  name   = "aurora-postgres15-custom"
  family = "aurora-postgresql15"

  parameter {
    name  = "log_min_duration_statement"
    value = "500"
  }
}
```

---

## Summary

Create `aws_db_parameter_group` with the correct `family` (e.g., `postgres15`, `mysql8.0`) and add `parameter` blocks for each setting. Reference the group in `aws_db_instance` via `parameter_group_name`. Use `apply_method = "pending-reboot"` for settings that require an instance restart and `apply_method = "immediate"` for dynamic parameters.
