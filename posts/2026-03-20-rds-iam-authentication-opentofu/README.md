# How to Configure RDS IAM Authentication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, IAM Authentication, Passwordless, Security, Infrastructure as Code

Description: Learn how to enable RDS IAM database authentication using OpenTofu to allow applications and users to connect to MySQL and PostgreSQL databases using IAM credentials instead of passwords.

## Introduction

RDS IAM Authentication allows EC2 instances, Lambda functions, and IAM users to authenticate to MySQL or PostgreSQL databases using short-lived IAM authentication tokens instead of passwords. This eliminates the need to manage and rotate database passwords for applications.

## Prerequisites

- OpenTofu v1.6+
- RDS MySQL 5.7+ or PostgreSQL 10+

## Step 1: Enable IAM Authentication on RDS Instance

```hcl
resource "aws_db_instance" "iam_auth" {
  identifier     = "${var.project_name}-iam-auth-db"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.t3.medium"

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password  # Still needed when creating the master user

  # Enable IAM database authentication
  iam_database_authentication_enabled = true

  storage_type      = "gp3"
  allocated_storage = 50
  storage_encrypted = true

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  tags = {
    Name       = "${var.project_name}-iam-auth-db"
    IAMAuth    = "enabled"
  }
}
```

## Step 2: Create IAM Policy for Database Authentication

```hcl
# Look up the current AWS account ID for the rds-db ARN
data "aws_caller_identity" "current" {}

# IAM policy granting permission to connect using IAM authentication

resource "aws_iam_policy" "rds_connect" {
  name        = "RDSIAMConnectPolicy"
  description = "Allow connecting to RDS using IAM authentication"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowRDSConnect"
      Effect = "Allow"
      Action = "rds-db:connect"
      Resource = [
        # Format: arn:aws:rds-db:region:account-id:dbuser:db-resource-id/db-username
        "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.iam_auth.resource_id}/${var.iam_db_username}"
      ]
    }]
  })
}

# Attach policy to Lambda or EC2 role
resource "aws_iam_role_policy_attachment" "rds_connect" {
  role       = var.application_role_name
  policy_arn = aws_iam_policy.rds_connect.arn
}
```

## Step 3: Create Database User for IAM Authentication

```text
# For PostgreSQL - create user with rds_iam role
# Run these SQL commands on the RDS instance:

# Connect with master credentials
psql -h my-db.123456789012.us-east-1.rds.amazonaws.com -U masteruser -d mydb

# Create the IAM user
CREATE USER app_user;
GRANT rds_iam TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;

# For MySQL:
# CREATE USER 'app_user'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';
# GRANT SELECT, INSERT ON mydb.* TO 'app_user'@'%';
```

## Step 4: Connect Using IAM Authentication in Python

```python
# Generate an IAM authentication token and use it to connect
import boto3
import psycopg2

def get_db_connection():
    """Connect to RDS PostgreSQL using IAM authentication."""
    client = boto3.client('rds', region_name='us-east-1')

    # Generate an authentication token (valid for 15 minutes)
    token = client.generate_db_auth_token(
        DBHostname='my-db.123456789012.us-east-1.rds.amazonaws.com',
        Port=5432,
        DBUsername='app_user',
        Region='us-east-1'
    )

    # Connect using the token as the password
    conn = psycopg2.connect(
        host='my-db.123456789012.us-east-1.rds.amazonaws.com',
        port=5432,
        dbname='mydb',
        user='app_user',
        password=token,
        sslmode='verify-full',  # SSL/TLS is required for IAM auth
        sslrootcert='/path/to/global-bundle.pem'
    )

    return conn

conn = get_db_connection()
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

RDS IAM Authentication eliminates password management for application database connections-tokens are automatically generated and expire after 15 minutes, limiting exposure. Pair IAM authentication with SSL/TLS (required) and restrict the `rds-db:connect` permission to specific database users and DB resource IDs for least-privilege access. The master user is still created with a password, so continue to manage that credential securely via Secrets Manager for administrative access.
