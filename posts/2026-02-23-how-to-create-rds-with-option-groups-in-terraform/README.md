# How to Create RDS with Option Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Option Groups, Database, Infrastructure as Code

Description: Learn how to create RDS instances with custom option groups in Terraform for enabling additional database features like native backup, audit plugins, and SSL configurations.

---

RDS option groups enable additional features and capabilities for your database engines that go beyond what parameter groups offer. While parameter groups configure engine settings, option groups add entire features like Oracle native backup, MySQL memcached plugin, SQL Server audit logging, and transparent data encryption. This guide covers creating and managing RDS option groups with Terraform.

## What Are Option Groups?

Option groups are containers for database engine options (also called features or plugins). Not all database engines use option groups - they are most relevant for MySQL, MariaDB, Oracle, and SQL Server. PostgreSQL and Aurora do not use option groups in the same way.

Each option may have its own settings, port requirements, and security group associations. Options can be added or removed from running instances, though some require a reboot.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with private subnets. Understanding of your database engine's available options is helpful.

## MySQL Option Group

```hcl
provider "aws" {
  region = "us-east-1"
}

# Custom option group for MySQL 8.0
resource "aws_db_option_group" "mysql" {
  name                 = "custom-mysql80-options"
  engine_name          = "mysql"
  major_engine_version = "8.0"
  option_group_description = "Custom options for MySQL 8.0 with audit and memcached"

  # MariaDB Audit Plugin - logs database activity
  option {
    option_name = "MARIADB_AUDIT_PLUGIN"

    option_settings {
      name  = "SERVER_AUDIT_EVENTS"
      value = "CONNECT,QUERY_DDL,QUERY_DML"  # Log connections and queries
    }

    option_settings {
      name  = "SERVER_AUDIT_FILE_ROTATIONS"
      value = "37"  # Keep 37 log files
    }

    option_settings {
      name  = "SERVER_AUDIT_FILE_ROTATE_SIZE"
      value = "10000000"  # 10 MB per log file
    }

    option_settings {
      name  = "SERVER_AUDIT_EXCL_USERS"
      value = "rdsadmin"  # Exclude internal RDS admin user
    }
  }

  tags = {
    Name        = "mysql-options"
    Environment = "production"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## SQL Server Option Group

```hcl
# Option group for SQL Server Enterprise
resource "aws_db_option_group" "sqlserver" {
  name                 = "custom-sqlserver-ee-15"
  engine_name          = "sqlserver-ee"
  major_engine_version = "15.00"
  option_group_description = "SQL Server Enterprise options with TDE and audit"

  # Transparent Data Encryption (TDE)
  option {
    option_name = "TDE"
  }

  # SQL Server Audit
  option {
    option_name = "SQLSERVER_AUDIT"

    option_settings {
      name  = "IAM_ROLE_ARN"
      value = aws_iam_role.sqlserver_audit.arn
    }

    option_settings {
      name  = "S3_BUCKET_ARN"
      value = aws_s3_bucket.audit_logs.arn
    }
  }

  # SQL Server native backup and restore
  option {
    option_name = "SQLSERVER_BACKUP_RESTORE"

    option_settings {
      name  = "IAM_ROLE_ARN"
      value = aws_iam_role.sqlserver_backup.arn
    }
  }

  tags = {
    Name = "sqlserver-options"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# IAM role for SQL Server audit
resource "aws_iam_role" "sqlserver_audit" {
  name = "rds-sqlserver-audit-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for audit log delivery to S3
resource "aws_iam_role_policy" "sqlserver_audit" {
  name = "sqlserver-audit-s3-policy"
  role = aws_iam_role.sqlserver_audit.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetBucketACL",
          "s3:GetBucketLocation"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.audit_logs.arn,
          "${aws_s3_bucket.audit_logs.arn}/*"
        ]
      }
    ]
  })
}

# S3 bucket for audit logs
resource "aws_s3_bucket" "audit_logs" {
  bucket = "rds-audit-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "rds-audit-logs"
  }
}

data "aws_caller_identity" "current" {}

# IAM role for SQL Server backup/restore
resource "aws_iam_role" "sqlserver_backup" {
  name = "rds-sqlserver-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "sqlserver_backup" {
  name = "sqlserver-backup-s3-policy"
  role = aws_iam_role.sqlserver_backup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:s3:::my-sqlserver-backups"
      },
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListMultipartUploadParts",
          "s3:AbortMultipartUpload"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:s3:::my-sqlserver-backups/*"
      }
    ]
  })
}
```

## Oracle Option Group

```hcl
# Option group for Oracle Enterprise Edition
resource "aws_db_option_group" "oracle" {
  name                 = "custom-oracle-ee-19"
  engine_name          = "oracle-ee"
  major_engine_version = "19"
  option_group_description = "Oracle EE options with native backup and SSL"

  # Oracle native backup to S3
  option {
    option_name = "S3_INTEGRATION"
    version     = "1.0"

    option_settings {
      name  = "IAM_ROLE_ARN"
      value = aws_iam_role.oracle_s3.arn
    }
  }

  # Oracle SSL/TLS
  option {
    option_name = "SSL"

    option_settings {
      name  = "SQLNET.SSL_VERSION"
      value = "1.2"
    }

    # Port for SSL connections
    port = 2484

    # Security group for SSL connections
    vpc_security_group_memberships = [aws_security_group.oracle_ssl.id]
  }

  # Oracle Statspack (performance monitoring)
  option {
    option_name = "STATSPACK"
  }

  # Oracle timezone file update
  option {
    option_name = "Timezone"

    option_settings {
      name  = "TIME_ZONE"
      value = "UTC"
    }
  }

  tags = {
    Name = "oracle-options"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Security group for Oracle SSL port
resource "aws_security_group" "oracle_ssl" {
  name_prefix = "oracle-ssl-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Oracle SSL connections"

  ingress {
    from_port       = 2484
    to_port         = 2484
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Oracle SSL from application tier"
  }

  tags = {
    Name = "oracle-ssl-sg"
  }
}

resource "aws_iam_role" "oracle_s3" {
  name = "rds-oracle-s3-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
    }]
  })
}
```

## RDS Instance with Both Parameter and Option Groups

```hcl
# Custom parameter group
resource "aws_db_parameter_group" "mysql_prod" {
  name   = "mysql-prod-params"
  family = "mysql8.0"

  parameter {
    name  = "max_connections"
    value = "500"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# RDS instance with both custom groups
resource "aws_db_instance" "production" {
  identifier     = "production-mysql"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 200
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "admin"
  password = var.db_password

  # Both custom parameter and option groups
  parameter_group_name = aws_db_parameter_group.mysql_prod.name
  option_group_name    = aws_db_option_group.mysql.name

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 14
  skip_final_snapshot     = false
  final_snapshot_identifier = "production-mysql-final"

  tags = {
    Name        = "production-mysql"
    Environment = "production"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnets"
  subnet_ids = aws_subnet.private[*].id
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Checking Available Options

Before creating option groups, you can check which options are available for your engine using a data source.

```hcl
# List available options for MySQL 8.0
data "aws_rds_orderable_db_instance" "mysql" {
  engine         = "mysql"
  engine_version = "8.0"
  license_model  = "general-public-license"
  instance_class = "db.r6g.xlarge"
}

output "available_instance_info" {
  value = data.aws_rds_orderable_db_instance.mysql
}
```

## Outputs

```hcl
output "option_group_name" {
  description = "Name of the custom option group"
  value       = aws_db_option_group.mysql.name
}

output "option_group_arn" {
  description = "ARN of the custom option group"
  value       = aws_db_option_group.mysql.arn
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.production.endpoint
}
```

## Common Pitfalls

Changing an option that requires a reboot will trigger a maintenance event. Plan these changes during maintenance windows. Some options cannot be removed once added (like TDE for SQL Server). Always test option group changes in a non-production environment first.

When upgrading engine versions, you may need to create new option groups that match the new major version, as option groups are version-specific.

## Conclusion

Option groups extend your RDS databases with powerful features like audit logging, native backup, encryption, and more. Combined with custom parameter groups, they give you full control over your database configuration. Terraform makes these configurations reproducible and version-controlled, ensuring consistency across your database fleet.

For more RDS topics, see our guide on [How to Create RDS with Enhanced Monitoring in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rds-with-enhanced-monitoring-in-terraform/view).
