# How to Create RDS Proxy with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS Proxy, Database, Connection Pooling, Serverless, Infrastructure as Code

Description: Learn how to create RDS Proxy with Terraform for connection pooling, improved availability, and reduced database connection overhead for serverless and containerized applications.

---

RDS Proxy sits between your application and your RDS database, managing a pool of database connections and sharing them across application instances. This is particularly valuable for serverless applications (Lambda functions) that create many short-lived connections, containerized workloads with unpredictable scaling, and applications that overwhelm their database with too many connections. This guide covers setting up RDS Proxy with Terraform.

## Why RDS Proxy?

Without connection pooling, each application instance opens its own database connections. A Lambda function that scales to 1,000 concurrent executions could attempt to open 1,000 database connections, quickly exhausting the database's connection limit. RDS Proxy solves this by maintaining a warm pool of connections and multiplexing application requests through them.

RDS Proxy also improves availability by automatically connecting to a standby database during failovers, reducing failover time from minutes to seconds.

## Prerequisites

You need Terraform 1.0 or later, an existing RDS instance (MySQL or PostgreSQL), a VPC with private subnets, and database credentials stored in AWS Secrets Manager.

## Complete RDS Proxy Setup

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC and networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "proxy-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${count.index + 1}"
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id
  description = "RDS database security group"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.proxy.id]
    description     = "PostgreSQL from RDS Proxy"
  }

  tags = {
    Name = "rds-sg"
  }
}

# Security group for RDS Proxy
resource "aws_security_group" "proxy" {
  name_prefix = "rds-proxy-"
  vpc_id      = aws_vpc.main.id
  description = "RDS Proxy security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "PostgreSQL from VPC"
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
    description     = "PostgreSQL to RDS"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS to Secrets Manager endpoint"
  }

  tags = {
    Name = "rds-proxy-sg"
  }
}

# Database credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "rds-proxy/db-credentials"

  tags = {
    Name = "rds-proxy-credentials"
  }
}

resource "random_password" "db" {
  length  = 32
  special = true
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = "admin"
    password = random_password.db.result
  })
}

# RDS Instance
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnets"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier     = "proxy-backend-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"

  allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "appdb"
  username = "admin"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 7

  lifecycle {
    ignore_changes = [password]
  }

  tags = {
    Name = "proxy-backend-postgres"
  }
}
```

## IAM Role for RDS Proxy

```hcl
# IAM role for RDS Proxy to access Secrets Manager
resource "aws_iam_role" "proxy" {
  name = "rds-proxy-role"

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

# Policy allowing RDS Proxy to read secrets
resource "aws_iam_role_policy" "proxy" {
  name = "rds-proxy-secrets-policy"
  role = aws_iam_role.proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.us-east-1.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

## Creating the RDS Proxy

```hcl
# RDS Proxy
resource "aws_db_proxy" "main" {
  name                   = "app-db-proxy"
  debug_logging          = false  # Enable for troubleshooting only
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800  # 30 minutes idle timeout
  require_tls            = true   # Enforce TLS connections
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = aws_subnet.private[*].id

  auth {
    auth_scheme = "SECRETS"
    description = "Database credentials from Secrets Manager"
    iam_auth    = "DISABLED"  # Use password auth (can enable IAM auth too)
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  tags = {
    Name        = "app-db-proxy"
    Environment = "production"
  }
}

# Default target group (connection pool configuration)
resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    # Maximum percentage of available connections the proxy can use
    max_connections_percent = 90

    # Percentage of connections to keep open even when idle
    max_idle_connections_percent = 50

    # Seconds to wait for a connection from the pool
    connection_borrow_timeout = 120

    # SQL to run when a connection is borrowed from the pool
    init_query = "SET application_name = 'rds_proxy'"

    # Session pinning filters
    session_pinning_filters = ["EXCLUDE_VARIABLE_SETS"]
  }
}

# Register the RDS instance as a target
resource "aws_db_proxy_target" "main" {
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
  db_instance_identifier = aws_db_instance.main.identifier
}
```

## RDS Proxy with IAM Authentication

```hcl
# Proxy with IAM authentication enabled
resource "aws_db_proxy" "iam_proxy" {
  name                   = "iam-db-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = aws_subnet.private[*].id

  auth {
    auth_scheme = "SECRETS"
    description = "Password authentication"
    iam_auth    = "REQUIRED"  # Require IAM authentication
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  tags = {
    Name = "iam-db-proxy"
  }
}

# IAM policy for connecting through the proxy with IAM auth
resource "aws_iam_policy" "proxy_connect" {
  name = "rds-proxy-connect"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "rds-db:connect"
        Resource = "arn:aws:rds-db:us-east-1:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_proxy.iam_proxy.id}/app_user"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

## Read-Only Proxy Endpoint

```hcl
# Read-only endpoint for read replicas
resource "aws_db_proxy_endpoint" "read_only" {
  db_proxy_name          = aws_db_proxy.main.name
  db_proxy_endpoint_name = "read-only"
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.proxy.id]
  target_role            = "READ_ONLY"

  tags = {
    Name = "read-only-proxy-endpoint"
  }
}
```

## CloudWatch Alarms for RDS Proxy

```hcl
# Monitor proxy connection count
resource "aws_cloudwatch_metric_alarm" "proxy_connections" {
  alarm_name          = "rds-proxy-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 100
  alarm_description   = "RDS Proxy has high number of database connections"

  dimensions = {
    ProxyName = aws_db_proxy.main.name
  }
}
```

## Outputs

```hcl
output "proxy_endpoint" {
  description = "RDS Proxy endpoint (use this instead of direct RDS endpoint)"
  value       = aws_db_proxy.main.endpoint
}

output "proxy_read_only_endpoint" {
  description = "Read-only proxy endpoint"
  value       = aws_db_proxy_endpoint.read_only.endpoint
}

output "rds_direct_endpoint" {
  description = "Direct RDS endpoint (for admin tasks only)"
  value       = aws_db_instance.main.endpoint
}
```

## Conclusion

RDS Proxy provides essential connection management for modern applications, especially serverless and containerized workloads that create many short-lived database connections. With Terraform, you can deploy and configure RDS Proxy consistently, including connection pool settings, IAM authentication, and monitoring. Always connect your applications through the proxy endpoint rather than directly to the database to benefit from connection pooling and improved failover.

For more database topics, see our guide on [How to Create Aurora Serverless with Auto-Pause in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aurora-serverless-with-auto-pause-in-terraform/view).
