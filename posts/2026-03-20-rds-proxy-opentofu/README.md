# How to Create RDS Proxy with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, RDS Proxy, Connection Pooling, Lambda, Infrastructure as Code

Description: Learn how to deploy RDS Proxy using OpenTofu to provide connection pooling, improved resilience during failovers, and IAM authentication for database connections from Lambda and ECS.

## Introduction

RDS Proxy maintains a pool of database connections, reducing the overhead of opening new connections for each Lambda invocation or microservice request. It also improves resilience during failovers and supports IAM authentication, making it ideal for serverless architectures.

## Prerequisites

- OpenTofu v1.6+
- An existing RDS instance
- A Secrets Manager secret containing the database credentials for the proxy
- AWS credentials with RDS, IAM, and Secrets Manager permissions

## Step 1: Create IAM Role for RDS Proxy

```hcl
resource "aws_iam_role" "rds_proxy" {
  name = "${var.project_name}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "rds_proxy" {
  name = "rds-proxy-secrets-policy"
  role = aws_iam_role.rds_proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = var.kms_key_arn
      }
    ]
  })
}
```

## Step 2: Create RDS Proxy

```hcl
resource "aws_db_proxy" "main" {
  name                   = "${var.project_name}-rds-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"  # or "MYSQL"
  idle_client_timeout    = 1800  # 30 minutes
  require_tls            = true  # Enforce TLS connections
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  vpc_subnet_ids         = var.private_subnet_ids

  auth {
    auth_scheme = "SECRETS"
    description = "RDS database credentials from Secrets Manager"
    iam_auth    = "REQUIRED"  # Require IAM authentication for client connections to the proxy
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  tags = {
    Name        = "${var.project_name}-rds-proxy"
    Environment = var.environment
  }
}
```

## Step 3: Create Proxy Default Target Group

```hcl
# Associate the proxy with the RDS instance

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120   # Max seconds to wait for connection
    max_connections_percent      = 100   # Use up to 100% of max_connections
    max_idle_connections_percent = 50    # Keep 50% of max idle connections
  }
}

resource "aws_db_proxy_target" "main" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
}
```

## Step 4: Security Group for the Proxy

```hcl
resource "aws_security_group" "rds_proxy" {
  name        = "${var.project_name}-rds-proxy-sg"
  description = "Security group for RDS Proxy"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.lambda_security_group_id, var.ecs_security_group_id]
    description     = "PostgreSQL from application"
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.rds_security_group_id]
    description     = "PostgreSQL to RDS"
  }
}
```

## Step 5: Outputs

```hcl
output "proxy_endpoint" {
  description = "RDS Proxy endpoint for read/write connections"
  value       = aws_db_proxy.main.endpoint
}

output "proxy_arn" {
  value = aws_db_proxy.main.arn
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the proxy connection with IAM authentication.
# The IAM principal running this command must have rds-db:connect permission for app_user on the proxy.
export AWS_REGION=us-east-1
export RDS_PROXY_ENDPOINT=$(tofu output -raw proxy_endpoint)
export PGPASSWORD=$(aws rds generate-db-auth-token \
  --hostname "$RDS_PROXY_ENDPOINT" \
  --port 5432 \
  --region "$AWS_REGION" \
  --username app_user)

psql "host=$RDS_PROXY_ENDPOINT port=5432 dbname=mydb user=app_user sslmode=require"
```

## Conclusion

RDS Proxy is especially valuable for Lambda functions where each invocation would otherwise open a new database connection. The proxy pools connections, reducing RDS max_connections consumption from hundreds of Lambda invocations to a manageable pool. Combine with IAM authentication for a secure configuration: applications authenticate to the proxy via IAM tokens without ever knowing the database password, while the proxy authenticates to the database using credentials from Secrets Manager.
