# How to Create Secrets Manager Secrets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Secrets Manager, Security

Description: Learn how to create and manage AWS Secrets Manager secrets with Terraform, including automatic rotation, KMS encryption, cross-account access, and integration with other services.

---

Hardcoded passwords and API keys in your codebase are a security incident waiting to happen. AWS Secrets Manager solves this by giving you a secure, centralized place to store and retrieve secrets. Your applications fetch secrets at runtime, secrets rotate automatically, and everything is encrypted with KMS.

Terraform can create and configure Secrets Manager secrets, but there's an important nuance: you usually don't want to put the actual secret value in your Terraform code. Let's explore how to handle that properly.

## Basic Secret

Here's the simplest way to create a secret. We'll create the secret resource and set the value separately:

```hcl
# Create the secret container
resource "aws_secretsmanager_secret" "db_password" {
  name        = "myapp/production/db-password"
  description = "Database password for the production application"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Set the secret value
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}
```

The secret value comes from a Terraform variable. You can pass it via environment variables, a `.tfvars` file (that's in `.gitignore`), or a CI/CD pipeline secret.

Here's the variable definition:

```hcl
# variables.tf
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true  # Prevents the value from showing in logs
}
```

The `sensitive = true` flag tells Terraform to mask this value in plan output and logs. But it's still stored in the state file, so make sure your state file is encrypted and access-controlled.

## JSON Secrets

Secrets Manager can store structured data as JSON. This is useful for database credentials that include multiple fields:

```hcl
# Secret with JSON value
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "myapp/production/db-credentials"
  description = "Database connection credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = "dbadmin"
    password = var.db_password
    host     = aws_db_instance.production.address
    port     = 5432
    dbname   = "myapp"
  })
}
```

Your application can then parse the JSON and extract individual fields. Most AWS SDKs have built-in support for this.

## KMS Encryption

By default, Secrets Manager uses an AWS-managed KMS key. For more control, use your own customer-managed key:

```hcl
# Secret encrypted with a customer-managed KMS key
resource "aws_secretsmanager_secret" "api_key" {
  name        = "myapp/production/api-key"
  description = "Third-party API key"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

For creating KMS keys, see our post on [creating KMS keys with Terraform](https://oneuptime.com/blog/post/create-kms-keys-with-terraform/view).

## Automatic Rotation

One of Secrets Manager's best features is automatic rotation. You provide a Lambda function that generates new credentials, and Secrets Manager calls it on a schedule.

For RDS databases, AWS provides built-in rotation Lambda functions:

```hcl
# Secret with automatic rotation
resource "aws_secretsmanager_secret" "rds_password" {
  name        = "myapp/production/rds-password"
  description = "RDS database password with automatic rotation"
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id = aws_secretsmanager_secret.rds_password.id

  secret_string = jsonencode({
    username = "dbadmin"
    password = var.initial_db_password
    engine   = "postgres"
    host     = aws_db_instance.production.address
    port     = 5432
    dbname   = "myapp"
  })
}

# Configure automatic rotation
resource "aws_secretsmanager_secret_rotation" "rds_password" {
  secret_id           = aws_secretsmanager_secret.rds_password.id
  rotation_lambda_arn = aws_lambda_function.secret_rotator.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

The rotation Lambda function needs specific IAM permissions to update the secret and the database credentials. AWS provides managed rotation functions for RDS, Redshift, and DocumentDB.

## Custom Rotation Lambda

For non-database secrets (API keys, tokens, etc.), you'll need a custom rotation function:

```hcl
# Lambda function for secret rotation
resource "aws_lambda_function" "secret_rotator" {
  function_name = "secret-rotator"
  runtime       = "python3.12"
  handler       = "rotator.handler"
  role          = aws_iam_role.rotator.arn
  filename      = data.archive_file.rotator.output_path
  timeout       = 60

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.aws_region}.amazonaws.com"
    }
  }
}

# Permission for Secrets Manager to invoke the Lambda
resource "aws_lambda_permission" "secrets_manager" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotator.function_name
  principal     = "secretsmanager.amazonaws.com"
}

# IAM role for the rotation Lambda
resource "aws_iam_role" "rotator" {
  name = "secret-rotator-role"

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

resource "aws_iam_role_policy" "rotator" {
  name = "secret-rotation-policy"
  role = aws_iam_role.rotator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.rds_password.arn
      },
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetRandomPassword"
        Resource = "*"
      }
    ]
  })
}
```

## Resource Policy for Cross-Account Access

Allow another AWS account to retrieve your secrets:

```hcl
# Resource policy for cross-account access
resource "aws_secretsmanager_secret_policy" "cross_account" {
  secret_arn = aws_secretsmanager_secret.api_key.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountRead"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::987654321098:role/app-server"
        }
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Generating Random Passwords

Terraform can generate random passwords for you, which is great for initial secret values:

```hcl
# Generate a random password
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*()"
}

# Store it in Secrets Manager
resource "aws_secretsmanager_secret" "generated" {
  name = "myapp/production/generated-password"
}

resource "aws_secretsmanager_secret_version" "generated" {
  secret_id     = aws_secretsmanager_secret.generated.id
  secret_string = random_password.db.result
}
```

This way, even you as the operator don't know the password. The application retrieves it from Secrets Manager at runtime.

## Naming Conventions

Use a consistent naming convention for your secrets. Slashes create a hierarchy in the console:

```hcl
# Environment/service/secret-name pattern
locals {
  secret_prefix = "${var.app_name}/${var.environment}"
}

resource "aws_secretsmanager_secret" "db" {
  name = "${local.secret_prefix}/database/credentials"
}

resource "aws_secretsmanager_secret" "redis" {
  name = "${local.secret_prefix}/redis/auth-token"
}

resource "aws_secretsmanager_secret" "api" {
  name = "${local.secret_prefix}/external/stripe-api-key"
}
```

This makes it easy to grant permissions to all secrets under a prefix using wildcard IAM policies.

## Reading Secrets in Terraform

Sometimes you need to read an existing secret in Terraform (for example, to pass it to another resource):

```hcl
# Read an existing secret
data "aws_secretsmanager_secret_version" "existing" {
  secret_id = "myapp/production/db-credentials"
}

# Use it in another resource
locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.existing.secret_string)
}
```

## Recovery and Deletion

Secrets Manager keeps deleted secrets for a recovery window before permanently deleting them:

```hcl
# Secret with custom recovery window
resource "aws_secretsmanager_secret" "recoverable" {
  name                    = "myapp/important-secret"
  recovery_window_in_days = 30  # Default is 30, min is 7

  # Set to 0 to force immediate deletion (dangerous!)
  # recovery_window_in_days = 0
}
```

## Wrapping Up

Secrets Manager with Terraform handles the configuration and lifecycle of your secrets, while keeping the actual secret values out of your codebase. Use `sensitive = true` on variables, encrypt your state file, and set up automatic rotation for anything that changes regularly. The combination of Secrets Manager, KMS, and IAM gives you a robust secrets management strategy that's auditable and automated.
