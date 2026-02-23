# How to Create RDS with IAM Authentication in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, IAM Authentication, Database Security, Infrastructure as Code

Description: Learn how to create RDS instances with IAM database authentication in Terraform, replacing static passwords with temporary tokens for improved security and credential management.

---

IAM database authentication allows you to connect to RDS instances using IAM roles and temporary authentication tokens instead of static database passwords. This eliminates the need to store database credentials in application configuration, provides fine-grained access control through IAM policies, and enables credential rotation without database changes. This guide covers setting up IAM authentication for RDS with Terraform.

## How IAM Authentication Works

Instead of using a traditional username and password, IAM authentication generates a temporary token (valid for 15 minutes) using the AWS SDK. The application requests this token with its IAM credentials, then uses it as the password when connecting to the database. The database validates the token against IAM, and if the user has the correct IAM policy, the connection is allowed.

This approach works with MySQL, PostgreSQL, and MariaDB engines on RDS. Aurora also supports IAM authentication.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, a VPC with private subnets, and applications that can use the AWS SDK to generate authentication tokens.

## RDS Instance with IAM Authentication

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC and networking setup
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "iam-auth-vpc"
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

resource "aws_db_subnet_group" "main" {
  name       = "iam-auth-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "iam-auth-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "rds-iam-"
  vpc_id      = aws_vpc.main.id
  description = "RDS with IAM authentication"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "rds-iam-sg"
  }
}

# RDS instance with IAM authentication enabled
resource "aws_db_instance" "iam_auth" {
  identifier     = "iam-auth-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"

  allocated_storage     = 50
  max_allocated_storage = 200
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "admin"
  password = var.master_password  # Master password is still needed for admin

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Enable IAM authentication
  iam_database_authentication_enabled = true

  multi_az            = true
  publicly_accessible = false

  # Force SSL connections (required for IAM auth)
  parameter_group_name = aws_db_parameter_group.iam_auth.name

  backup_retention_period = 14

  tags = {
    Name        = "iam-auth-postgres"
    Environment = "production"
  }
}

variable "master_password" {
  type      = string
  sensitive = true
}

# Parameter group enforcing SSL (required for IAM authentication)
resource "aws_db_parameter_group" "iam_auth" {
  name   = "iam-auth-params"
  family = "postgres15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"  # IAM authentication requires SSL
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## IAM Policy for Database Access

Create IAM policies that grant specific users or roles the ability to connect to the database.

```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# IAM policy allowing connection to the RDS instance
resource "aws_iam_policy" "rds_connect" {
  name        = "rds-iam-connect"
  description = "Allow IAM authentication to the RDS instance"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "rds-db:connect"
        Resource = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.iam_auth.resource_id}/app_user"
      }
    ]
  })
}

# Policy for read-only database user
resource "aws_iam_policy" "rds_connect_readonly" {
  name        = "rds-iam-connect-readonly"
  description = "Allow IAM authentication as read-only user"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "rds-db:connect"
        Resource = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.iam_auth.resource_id}/readonly_user"
      }
    ]
  })
}

# Policy allowing connection as multiple database users
resource "aws_iam_policy" "rds_connect_multi" {
  name        = "rds-iam-connect-multi-user"
  description = "Allow IAM authentication as multiple database users"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "rds-db:connect"
        Resource = [
          "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.iam_auth.resource_id}/app_user",
          "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.iam_auth.resource_id}/migration_user"
        ]
      }
    ]
  })
}
```

## IAM Role for Application (ECS/EC2)

```hcl
# IAM role for ECS tasks that connect to the database
resource "aws_iam_role" "app_task" {
  name = "app-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the RDS connect policy to the app role
resource "aws_iam_role_policy_attachment" "app_rds" {
  role       = aws_iam_role.app_task.name
  policy_arn = aws_iam_policy.rds_connect.arn
}

# IAM role for EC2 instances
resource "aws_iam_role" "app_ec2" {
  name = "app-ec2-role"

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

resource "aws_iam_role_policy_attachment" "ec2_rds" {
  role       = aws_iam_role.app_ec2.name
  policy_arn = aws_iam_policy.rds_connect.arn
}

resource "aws_iam_instance_profile" "app" {
  name = "app-ec2-profile"
  role = aws_iam_role.app_ec2.name
}

# IAM role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "lambda-rds-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_rds" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.rds_connect.arn
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
```

## Database User Setup

After creating the RDS instance, you need to create database users that map to IAM authentication. This is typically done via a provisioner or manually.

```hcl
# Note: The actual SQL commands to create IAM-authenticated users
# must be run against the database after it is created.
#
# For PostgreSQL:
#   CREATE USER app_user WITH LOGIN;
#   GRANT rds_iam TO app_user;
#   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
#
# For MySQL:
#   CREATE USER 'app_user'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';
#   GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'app_user'@'%';

# Output the connection info
output "rds_endpoint" {
  description = "RDS endpoint for connections"
  value       = aws_db_instance.iam_auth.endpoint
}

output "rds_resource_id" {
  description = "RDS resource ID (needed for IAM policy ARN)"
  value       = aws_db_instance.iam_auth.resource_id
}

output "connection_example" {
  description = "Example command to generate an auth token"
  value       = "aws rds generate-db-auth-token --hostname ${aws_db_instance.iam_auth.address} --port 5432 --region ${data.aws_region.current.name} --username app_user"
}
```

## Application Connection Example

Here is how an application would connect using IAM authentication with Python.

```python
# This is a Python example - not Terraform code
# Save as connect_rds.py
import boto3
import psycopg2
import ssl

def get_auth_token(hostname, port, username, region):
    """Generate an IAM authentication token."""
    client = boto3.client('rds', region_name=region)
    token = client.generate_db_auth_token(
        DBHostname=hostname,
        Port=port,
        DBUsername=username,
        Region=region
    )
    return token

# Generate the authentication token
token = get_auth_token(
    hostname='iam-auth-postgres.abc123.us-east-1.rds.amazonaws.com',
    port=5432,
    username='app_user',
    region='us-east-1'
)

# Connect using the token as the password
conn = psycopg2.connect(
    host='iam-auth-postgres.abc123.us-east-1.rds.amazonaws.com',
    port=5432,
    database='appdb',
    user='app_user',
    password=token,
    sslmode='require'
)
```

## Conclusion

IAM database authentication eliminates static passwords, provides centralized access management through IAM, and enables automatic credential rotation. With Terraform, you can consistently configure IAM authentication across your RDS fleet and manage the associated IAM policies as code. This approach is particularly valuable in environments where security compliance requires avoiding long-lived credentials.

For more RDS security topics, see our guide on [How to Handle RDS Password Rotation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-rds-password-rotation-with-terraform/view).
