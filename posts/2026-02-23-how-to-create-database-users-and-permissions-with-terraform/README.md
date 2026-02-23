# How to Create Database Users and Permissions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Security, IAM, Permissions, Infrastructure as Code

Description: Learn how to manage database users and permissions using Terraform including RDS IAM authentication, Secrets Manager integration, and provider-based user management.

---

Managing database users and permissions is a critical part of database security. While the master user is created when you provision the database, production applications typically need multiple users with different permission levels. In this guide, we will cover several approaches to managing database users and permissions with Terraform, from IAM database authentication to using Terraform database providers.

## Understanding the Approaches

There are several ways to manage database users with Terraform. You can use IAM database authentication, which lets IAM users and roles authenticate to your database without passwords. You can use the Terraform PostgreSQL or MySQL providers to create database users directly. You can use AWS Secrets Manager to store and rotate credentials. Or you can combine these approaches for a comprehensive solution.

## Setting Up the Providers

```hcl
# Configure Terraform with multiple providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.21"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Setting Up IAM Database Authentication

IAM database authentication is available for RDS MySQL, PostgreSQL, and Aurora:

```hcl
# RDS instance with IAM authentication enabled
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  storage_type      = "gp3"
  db_name           = "appdb"
  username          = "dbadmin"
  password          = var.db_password

  # Enable IAM database authentication
  iam_database_authentication_enabled = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  multi_az               = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "production-db-final"

  tags = {
    Environment = "production"
    IAMAuth     = "enabled"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Creating IAM Policies for Database Access

```hcl
# IAM policy for read-only database access
resource "aws_iam_policy" "db_read_only" {
  name        = "rds-db-read-only"
  description = "Read-only access to RDS database via IAM authentication"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.production.resource_id}/readonly_user"
      }
    ]
  })
}

# IAM policy for read-write database access
resource "aws_iam_policy" "db_read_write" {
  name        = "rds-db-read-write"
  description = "Read-write access to RDS database via IAM authentication"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.production.resource_id}/app_user"
      }
    ]
  })
}

# IAM policy for admin database access
resource "aws_iam_policy" "db_admin" {
  name        = "rds-db-admin"
  description = "Admin access to RDS database via IAM authentication"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.production.resource_id}/admin_user"
      }
    ]
  })
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Attach policies to IAM roles
resource "aws_iam_role" "app_role" {
  name = "application-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_db_access" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.db_read_write.arn
}
```

## Using Secrets Manager for Database Credentials

```hcl
# Generate a random password for the master user
resource "random_password" "master_password" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
}

# Store the master password in Secrets Manager
resource "aws_secretsmanager_secret" "db_master" {
  name                    = "production-db/master"
  description             = "Master credentials for the production database"
  recovery_window_in_days = 7

  tags = {
    Environment = "production"
    Database    = "production-db"
  }
}

resource "aws_secretsmanager_secret_version" "db_master" {
  secret_id = aws_secretsmanager_secret.db_master.id

  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.master_password.result
    host     = aws_db_instance.production.address
    port     = aws_db_instance.production.port
    dbname   = "appdb"
    engine   = "postgres"
  })
}

# Enable automatic rotation for the master password
resource "aws_secretsmanager_secret_rotation" "db_master_rotation" {
  secret_id           = aws_secretsmanager_secret.db_master.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Store application user credentials
resource "aws_secretsmanager_secret" "db_app_user" {
  name                    = "production-db/app-user"
  description             = "Application user credentials"
  recovery_window_in_days = 7

  tags = {
    Environment = "production"
    Database    = "production-db"
    UserType    = "application"
  }
}

resource "random_password" "app_user_password" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
}

resource "aws_secretsmanager_secret_version" "db_app_user" {
  secret_id = aws_secretsmanager_secret.db_app_user.id

  secret_string = jsonencode({
    username = "app_user"
    password = random_password.app_user_password.result
    host     = aws_db_instance.production.address
    port     = aws_db_instance.production.port
    dbname   = "appdb"
  })
}
```

## Using the PostgreSQL Provider to Create Users

The PostgreSQL Terraform provider can create users and manage permissions directly:

```hcl
# Configure the PostgreSQL provider
provider "postgresql" {
  host     = aws_db_instance.production.address
  port     = aws_db_instance.production.port
  database = "appdb"
  username = "dbadmin"
  password = var.db_password
  sslmode  = "require"
}

# Create a read-only role
resource "postgresql_role" "readonly" {
  name     = "readonly_role"
  login    = false

  depends_on = [aws_db_instance.production]
}

# Create a read-write role
resource "postgresql_role" "readwrite" {
  name     = "readwrite_role"
  login    = false

  depends_on = [aws_db_instance.production]
}

# Create application user with read-write role
resource "postgresql_role" "app_user" {
  name     = "app_user"
  login    = true
  password = random_password.app_user_password.result
  roles    = [postgresql_role.readwrite.name]

  depends_on = [aws_db_instance.production]
}

# Create read-only user for reporting
resource "postgresql_role" "reporting_user" {
  name     = "reporting_user"
  login    = true
  password = random_password.reporting_password.result
  roles    = [postgresql_role.readonly.name]

  depends_on = [aws_db_instance.production]
}

resource "random_password" "reporting_password" {
  length  = 32
  special = true
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
}

# Grant read-only permissions
resource "postgresql_grant" "readonly_tables" {
  database    = "appdb"
  role        = postgresql_role.readonly.name
  schema      = "public"
  object_type = "table"
  privileges  = ["SELECT"]

  depends_on = [aws_db_instance.production]
}

resource "postgresql_grant" "readonly_sequences" {
  database    = "appdb"
  role        = postgresql_role.readonly.name
  schema      = "public"
  object_type = "sequence"
  privileges  = ["SELECT", "USAGE"]

  depends_on = [aws_db_instance.production]
}

# Grant read-write permissions
resource "postgresql_grant" "readwrite_tables" {
  database    = "appdb"
  role        = postgresql_role.readwrite.name
  schema      = "public"
  object_type = "table"
  privileges  = ["SELECT", "INSERT", "UPDATE", "DELETE"]

  depends_on = [aws_db_instance.production]
}

resource "postgresql_grant" "readwrite_sequences" {
  database    = "appdb"
  role        = postgresql_role.readwrite.name
  schema      = "public"
  object_type = "sequence"
  privileges  = ["SELECT", "USAGE"]

  depends_on = [aws_db_instance.production]
}
```

## Managing Default Privileges

Ensure new tables automatically get the right permissions:

```hcl
# Set default privileges for readonly role on new tables
resource "postgresql_default_privileges" "readonly_tables" {
  database = "appdb"
  role     = postgresql_role.readonly.name
  schema   = "public"
  owner    = "dbadmin"

  object_type = "table"
  privileges  = ["SELECT"]

  depends_on = [aws_db_instance.production]
}

# Set default privileges for readwrite role on new tables
resource "postgresql_default_privileges" "readwrite_tables" {
  database = "appdb"
  role     = postgresql_role.readwrite.name
  schema   = "public"
  owner    = "dbadmin"

  object_type = "table"
  privileges  = ["SELECT", "INSERT", "UPDATE", "DELETE"]

  depends_on = [aws_db_instance.production]
}
```

## Creating IAM-Authenticated Database Users

For IAM authentication, you need to create the database user and grant the `rds_iam` role:

```hcl
# Create a user for IAM authentication
resource "postgresql_role" "iam_app_user" {
  name  = "iam_app_user"
  login = true
  roles = ["rds_iam", postgresql_role.readwrite.name]

  depends_on = [aws_db_instance.production]
}

# Create a read-only IAM user
resource "postgresql_role" "iam_readonly_user" {
  name  = "iam_readonly_user"
  login = true
  roles = ["rds_iam", postgresql_role.readonly.name]

  depends_on = [aws_db_instance.production]
}
```

## Outputs

```hcl
output "db_endpoint" {
  description = "Database endpoint"
  value       = aws_db_instance.production.endpoint
}

output "readonly_iam_policy_arn" {
  description = "ARN of the read-only IAM policy"
  value       = aws_iam_policy.db_read_only.arn
}

output "readwrite_iam_policy_arn" {
  description = "ARN of the read-write IAM policy"
  value       = aws_iam_policy.db_read_write.arn
}

output "master_secret_arn" {
  description = "ARN of the master password secret"
  value       = aws_secretsmanager_secret.db_master.arn
}

output "app_user_secret_arn" {
  description = "ARN of the app user password secret"
  value       = aws_secretsmanager_secret.db_app_user.arn
}
```

For monitoring database access patterns and detecting unauthorized connections, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you build dashboards that track user activity and connection metrics.

## Best Practices

Use IAM database authentication where possible to avoid managing passwords. Store all database credentials in Secrets Manager with automatic rotation enabled. Create role-based access patterns (readonly, readwrite, admin) rather than granting permissions to individual users. Use the principle of least privilege when defining permissions. Never use the master user for application connections. Use default privileges to ensure new database objects automatically inherit the correct permissions. Audit database access through PostgreSQL audit logging or RDS audit logs.

## Conclusion

Managing database users and permissions with Terraform gives you a repeatable, auditable way to control access to your databases. By combining IAM authentication, Secrets Manager, and the PostgreSQL provider, you can build a comprehensive access management strategy. Start with IAM authentication for AWS-native workloads and use the database provider for more granular permission management.
