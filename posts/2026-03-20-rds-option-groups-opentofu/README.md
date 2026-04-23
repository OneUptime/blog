# How to Configure RDS Option Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Option Groups, Database Features, MySQL, Infrastructure as Code

Description: Learn how to create and configure RDS option groups using OpenTofu to enable additional features and plugins for your RDS database engines like MySQL and Oracle.

## Introduction

RDS option groups enable additional features for specific database engines that require extra configuration, such as Oracle TDE, MySQL memcached integration, or SQL Server SSRS. Unlike parameter groups (which tune existing settings), option groups add new capabilities to the database engine.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS permissions

## Step 1: Create a MySQL Option Group with memcached

```hcl
# MySQL option group enabling memcached plugin for caching

resource "aws_db_option_group" "mysql_memcached" {
  name                     = "${var.project_name}-mysql-memcached"
  option_group_description = "MySQL with InnoDB memcached plugin"
  engine_name              = "mysql"
  major_engine_version     = "8.0"

  option {
    option_name = "MEMCACHED"

    option_settings {
      name  = "INNODB_API_ENABLE_MDL"
      value = "0"
    }

    option_settings {
      name  = "DAEMON_MEMCACHED_R_BATCH_SIZE"
      value = "1"
    }

    option_settings {
      name  = "DAEMON_MEMCACHED_W_BATCH_SIZE"
      value = "1"
    }

    # Port for memcached connections
    port                           = 11211
    vpc_security_group_memberships = [aws_security_group.rds.id]
  }

  tags = {
    Name    = "mysql-memcached-option-group"
    Engine  = "mysql-8.0"
  }
}
```

## Step 2: Create a MySQL Option Group with MariaDB Audit Plugin

```hcl
resource "aws_db_option_group" "mysql_audit" {
  name                     = "${var.project_name}-mysql-audit"
  option_group_description = "MySQL with MariaDB Audit Plugin for compliance"
  engine_name              = "mysql"
  major_engine_version     = "8.0"

  option {
    option_name = "MARIADB_AUDIT_PLUGIN"

    option_settings {
      name  = "SERVER_AUDIT_EVENTS"
      value = "CONNECT,QUERY_DDL,QUERY_DML"
    }

    option_settings {
      name  = "SERVER_AUDIT_EXCL_USERS"
      value = "rdsadmin"  # Exclude internal AWS user
    }
  }

  tags = { Name = "mysql-audit-option-group" }
}
```

## Step 3: Create an Empty Custom Option Group

```hcl
# Amazon RDS creates a default option group automatically.
# PostgreSQL doesn't use RDS option groups; it uses parameter groups
# and SQL commands such as CREATE EXTENSION instead.
# If you want to manage your own option group in code without adding
# options yet, create an empty custom option group for the same engine family.
resource "aws_db_option_group" "mysql_empty" {
  name                     = "${var.project_name}-mysql-empty"
  option_group_description = "Empty custom option group for MySQL"
  engine_name              = "mysql"
  major_engine_version     = "8.0"

  tags = { Name = "mysql-empty-option-group" }
}
```

## Step 4: Apply Option Group to an RDS Instance

```hcl
resource "aws_db_instance" "mysql_with_options" {
  identifier   = "${var.project_name}-mysql-audited"
  engine       = "mysql"
  engine_version = "8.0.45"
  instance_class = "db.t3.large"

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  # Apply both parameter group and option group
  parameter_group_name = aws_db_parameter_group.mysql_prod.name
  option_group_name    = aws_db_option_group.mysql_audit.name

  storage_type      = "gp3"
  allocated_storage = 100
  storage_encrypted = true

  tags = {
    Name    = "mysql-audited"
    Options = "audit"
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# List available options for an engine
aws rds describe-option-group-options \
  --engine-name mysql \
  --major-engine-version 8.0 \
  --query 'OptionGroupOptions[].Name'
```

## Conclusion

RDS option groups extend database capabilities beyond what parameter groups provide. The most common use cases are the MariaDB Audit Plugin for MySQL (compliance logging), Oracle TDE and RMAN for Oracle databases, and SQL Server features like SSRS and SSAS. Note that some options (like memcached) require network ports to be opened in the instance security group, so ensure your VPC security group rules are updated accordingly.
