# How to Handle Database Connection Strings in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Connection Strings, Secrets Manager, Infrastructure as Code

Description: Learn how to construct, manage, and securely distribute database connection strings using Terraform with Secrets Manager, SSM Parameter Store, and outputs.

---

Database connection strings are the bridge between your application and your database. They contain sensitive information like hostnames, ports, usernames, and sometimes passwords. Managing these connection strings properly is crucial for both security and operational efficiency. In this guide, we will cover how to construct, store, and distribute database connection strings using Terraform.

## Understanding Connection String Formats

Different databases use different connection string formats. PostgreSQL uses `postgresql://user:password@host:port/database`. MySQL uses `mysql://user:password@host:port/database`. MongoDB-compatible services like DocumentDB use `mongodb://user:password@host:port/database?options`. Redis uses `redis://[:password@]host:port` or `rediss://` for TLS connections. Understanding these formats helps you construct the right connection strings in Terraform.

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

## Constructing Connection Strings from RDS Outputs

```hcl
# Create the RDS instance
resource "aws_db_instance" "postgres" {
  identifier     = "app-postgres"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  storage_type      = "gp3"
  db_name           = "appdb"
  username          = "dbadmin"
  password          = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  multi_az               = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "app-postgres-final"

  tags = {
    Environment = "production"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

# Construct connection strings as outputs
output "postgres_connection_string" {
  description = "PostgreSQL connection string (without password)"
  value       = "postgresql://${aws_db_instance.postgres.username}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}?sslmode=require"
  sensitive   = false  # Safe because password is not included
}

output "postgres_host" {
  description = "PostgreSQL host"
  value       = aws_db_instance.postgres.address
}

output "postgres_port" {
  description = "PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

# Full connection string (marked sensitive)
output "postgres_full_connection_string" {
  description = "Full PostgreSQL connection string with password"
  value       = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}?sslmode=require"
  sensitive   = true
}
```

## Storing Connection Strings in Secrets Manager

The most secure approach is to store the full connection string in AWS Secrets Manager:

```hcl
# Store the connection details in Secrets Manager
resource "aws_secretsmanager_secret" "db_connection" {
  name                    = "production/database/connection"
  description             = "Database connection details for the production environment"
  recovery_window_in_days = 7

  tags = {
    Environment = "production"
    Service     = "database"
  }
}

resource "aws_secretsmanager_secret_version" "db_connection" {
  secret_id = aws_secretsmanager_secret.db_connection.id

  secret_string = jsonencode({
    # Individual connection parameters
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    username = aws_db_instance.postgres.username
    password = var.db_password
    database = aws_db_instance.postgres.db_name
    engine   = "postgres"

    # Pre-built connection strings for different formats
    connection_string = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}?sslmode=require"
    jdbc_url          = "jdbc:postgresql://${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}?ssl=true&sslmode=require"
  })
}

# Output the secret ARN for application configuration
output "db_secret_arn" {
  description = "ARN of the database connection secret"
  value       = aws_secretsmanager_secret.db_connection.arn
}
```

## Storing Connection Strings in SSM Parameter Store

For less sensitive connection details, SSM Parameter Store is a simpler option:

```hcl
# Store individual connection parameters in SSM
resource "aws_ssm_parameter" "db_host" {
  name        = "/production/database/host"
  description = "Database hostname"
  type        = "String"
  value       = aws_db_instance.postgres.address

  tags = {
    Environment = "production"
  }
}

resource "aws_ssm_parameter" "db_port" {
  name        = "/production/database/port"
  description = "Database port"
  type        = "String"
  value       = tostring(aws_db_instance.postgres.port)

  tags = {
    Environment = "production"
  }
}

resource "aws_ssm_parameter" "db_name" {
  name        = "/production/database/name"
  description = "Database name"
  type        = "String"
  value       = aws_db_instance.postgres.db_name

  tags = {
    Environment = "production"
  }
}

resource "aws_ssm_parameter" "db_username" {
  name        = "/production/database/username"
  description = "Database username"
  type        = "String"
  value       = aws_db_instance.postgres.username

  tags = {
    Environment = "production"
  }
}

# Store the password as a SecureString
resource "aws_ssm_parameter" "db_password" {
  name        = "/production/database/password"
  description = "Database password"
  type        = "SecureString"
  value       = var.db_password

  tags = {
    Environment = "production"
  }
}

# Store the full connection string as a SecureString
resource "aws_ssm_parameter" "db_connection_string" {
  name        = "/production/database/connection_string"
  description = "Full database connection string"
  type        = "SecureString"
  value       = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${aws_db_instance.postgres.db_name}?sslmode=require"

  tags = {
    Environment = "production"
  }
}
```

## Handling Aurora Connection Strings

Aurora clusters have separate endpoints for writes and reads:

```hcl
# Aurora cluster
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "app-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = true

  tags = {
    Environment = "production"
  }
}

# Store Aurora connection details with separate read/write endpoints
resource "aws_secretsmanager_secret" "aurora_connection" {
  name        = "production/aurora/connection"
  description = "Aurora connection details"

  tags = {
    Environment = "production"
  }
}

resource "aws_secretsmanager_secret_version" "aurora_connection" {
  secret_id = aws_secretsmanager_secret.aurora_connection.id

  secret_string = jsonencode({
    # Write endpoint
    writer_host = aws_rds_cluster.aurora.endpoint
    writer_url  = "postgresql://${aws_rds_cluster.aurora.master_username}:${var.db_password}@${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}/${aws_rds_cluster.aurora.database_name}?sslmode=require"

    # Read endpoint (load balanced across replicas)
    reader_host = aws_rds_cluster.aurora.reader_endpoint
    reader_url  = "postgresql://${aws_rds_cluster.aurora.master_username}:${var.db_password}@${aws_rds_cluster.aurora.reader_endpoint}:${aws_rds_cluster.aurora.port}/${aws_rds_cluster.aurora.database_name}?sslmode=require"

    # Common parameters
    port     = aws_rds_cluster.aurora.port
    username = aws_rds_cluster.aurora.master_username
    password = var.db_password
    database = aws_rds_cluster.aurora.database_name
  })
}
```

## Handling ElastiCache Redis Connection Strings

```hcl
# Redis replication group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "app-redis"
  description                = "Application Redis"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  engine                     = "redis"
  engine_version             = "7.0"
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis_sg.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  tags = {
    Environment = "production"
  }
}

variable "redis_auth_token" {
  type      = string
  sensitive = true
}

# Store Redis connection details
resource "aws_secretsmanager_secret" "redis_connection" {
  name        = "production/redis/connection"
  description = "Redis connection details"

  tags = {
    Environment = "production"
  }
}

resource "aws_secretsmanager_secret_version" "redis_connection" {
  secret_id = aws_secretsmanager_secret.redis_connection.id

  secret_string = jsonencode({
    # Primary endpoint for writes
    primary_host = aws_elasticache_replication_group.redis.primary_endpoint_address
    primary_url  = "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"

    # Reader endpoint for reads
    reader_host = aws_elasticache_replication_group.redis.reader_endpoint_address
    reader_url  = "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.reader_endpoint_address}:${aws_elasticache_replication_group.redis.port}"

    port       = aws_elasticache_replication_group.redis.port
    auth_token = var.redis_auth_token
    tls        = true
  })
}
```

## Handling DocumentDB Connection Strings

```hcl
# DocumentDB cluster
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier     = "app-docdb"
  engine                 = "docdb"
  master_username        = "docdbadmin"
  master_password        = var.db_password
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = true

  tags = {
    Environment = "production"
  }
}

# Store DocumentDB connection details
resource "aws_secretsmanager_secret" "docdb_connection" {
  name        = "production/documentdb/connection"
  description = "DocumentDB connection details"

  tags = {
    Environment = "production"
  }
}

resource "aws_secretsmanager_secret_version" "docdb_connection" {
  secret_id = aws_secretsmanager_secret.docdb_connection.id

  secret_string = jsonencode({
    host     = aws_docdb_cluster.docdb.endpoint
    reader   = aws_docdb_cluster.docdb.reader_endpoint
    port     = aws_docdb_cluster.docdb.port
    username = aws_docdb_cluster.docdb.master_username
    password = var.db_password

    # MongoDB-compatible connection string with TLS
    connection_string = "mongodb://${aws_docdb_cluster.docdb.master_username}:${var.db_password}@${aws_docdb_cluster.docdb.endpoint}:${aws_docdb_cluster.docdb.port}/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  })
}
```

## Passing Connection Strings to ECS Tasks

```hcl
# ECS task definition that reads connection details from Secrets Manager
resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "app:latest"

      # Pass connection string from Secrets Manager
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db_connection.arn}:connection_string::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_connection.arn}:password::"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "${aws_secretsmanager_secret.redis_connection.arn}:primary_url::"
        }
      ]

      # Non-sensitive values from environment
      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.postgres.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.postgres.port)
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.postgres.db_name
        }
      ]

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

## Using a Module for Connection String Management

```hcl
# modules/db-connection/main.tf
variable "environment" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type = number
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_engine" {
  type    = string
  default = "postgres"
}

locals {
  connection_string = var.db_engine == "postgres" ? "postgresql://${var.db_username}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}?sslmode=require" : "mysql://${var.db_username}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}?ssl=true"
}

resource "aws_secretsmanager_secret" "connection" {
  name = "${var.environment}/database/connection"

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "connection" {
  secret_id = aws_secretsmanager_secret.connection.id

  secret_string = jsonencode({
    host              = var.db_host
    port              = var.db_port
    username          = var.db_username
    password          = var.db_password
    database          = var.db_name
    engine            = var.db_engine
    connection_string = local.connection_string
  })
}

output "secret_arn" {
  value = aws_secretsmanager_secret.connection.arn
}
```

For monitoring database connectivity and detecting connection issues, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides comprehensive dashboards for tracking connection health.

## Best Practices

Never hardcode database credentials in Terraform code or application configuration. Use Secrets Manager for production credentials with automatic rotation. Use SSM Parameter Store for non-sensitive connection details like hostnames and ports. Mark sensitive outputs with `sensitive = true` in Terraform. Construct connection strings with SSL/TLS parameters included. Store separate read and write endpoints for Aurora and ElastiCache. Use ECS secrets integration or similar mechanisms to inject credentials at runtime. Rotate credentials regularly using Secrets Manager rotation functions.

## Conclusion

Handling database connection strings in Terraform requires balancing convenience with security. By storing connection details in Secrets Manager, constructing connection strings programmatically, and passing them securely to your applications, you create a robust credential management workflow. The key is never storing credentials in plain text and always using encryption in transit when connecting to your databases.
