# How to Build a Secrets Management Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Secrets Management, AWS Secrets Manager, KMS, Security, Infrastructure Patterns

Description: Build a secrets management infrastructure with Terraform using AWS Secrets Manager, KMS encryption, automatic rotation, and least-privilege access policies.

---

Hardcoded secrets in code, environment variables in plain text, shared passwords in spreadsheets - these are the reality for many organizations. It takes one leaked database password or API key to cause a serious security incident. A proper secrets management infrastructure solves this by centralizing secrets, encrypting them at rest, controlling access with fine-grained policies, and rotating them automatically.

In this guide, we will build a complete secrets management infrastructure on AWS using Terraform. We will cover AWS Secrets Manager, KMS encryption, automatic rotation, and the access patterns that keep secrets secure.

## Architecture Overview

Our secrets management infrastructure includes:

- AWS Secrets Manager for storing and rotating secrets
- KMS customer-managed keys for encryption
- IAM policies for least-privilege access
- Lambda functions for automatic rotation
- CloudTrail for audit logging
- Parameter Store for non-sensitive configuration

## KMS Key Hierarchy

Start with KMS keys. Different categories of secrets should use different keys so you can control access granularly:

```hcl
# KMS key for database credentials
resource "aws_kms_key" "database_secrets" {
  description             = "Encryption key for database credentials"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "RootAccountAccess"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowSecretsManagerUse"
        Effect    = "Allow"
        Principal = { AWS = "*" }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = var.account_id
            "kms:ViaService"    = "secretsmanager.${var.region}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Purpose = "database-secrets"
  }
}

resource "aws_kms_alias" "database_secrets" {
  name          = "alias/${var.project_name}/database-secrets"
  target_key_id = aws_kms_key.database_secrets.key_id
}

# KMS key for API keys and tokens
resource "aws_kms_key" "api_secrets" {
  description             = "Encryption key for API keys and tokens"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Purpose = "api-secrets"
  }
}

resource "aws_kms_alias" "api_secrets" {
  name          = "alias/${var.project_name}/api-secrets"
  target_key_id = aws_kms_key.api_secrets.key_id
}

# KMS key for application secrets
resource "aws_kms_key" "app_secrets" {
  description             = "Encryption key for application secrets"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Purpose = "application-secrets"
  }
}

resource "aws_kms_alias" "app_secrets" {
  name          = "alias/${var.project_name}/app-secrets"
  target_key_id = aws_kms_key.app_secrets.key_id
}
```

## Secrets Manager Module

Create a reusable module for managing secrets consistently:

```hcl
# modules/secret/main.tf
resource "aws_secretsmanager_secret" "this" {
  name        = "${var.project_name}/${var.secret_path}"
  description = var.description
  kms_key_id  = var.kms_key_id

  # Prevent accidental deletion
  recovery_window_in_days = var.recovery_window

  # Enable rotation if configured
  dynamic "rotation_rules" {
    for_each = var.rotation_enabled ? [1] : []
    content {
      automatically_after_days = var.rotation_days
    }
  }

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

# Set the initial secret value
resource "aws_secretsmanager_secret_version" "this" {
  secret_id     = aws_secretsmanager_secret.this.id
  secret_string = var.secret_value

  lifecycle {
    ignore_changes = [secret_string] # Rotation will update this
  }
}

# Resource policy for access control
resource "aws_secretsmanager_secret_policy" "this" {
  count      = var.resource_policy != null ? 1 : 0
  secret_arn = aws_secretsmanager_secret.this.arn
  policy     = var.resource_policy
}
```

## Database Credential Secrets

Store and automatically rotate database credentials:

```hcl
# RDS database secret with automatic rotation
module "rds_master_password" {
  source      = "./modules/secret"
  project_name = var.project_name
  secret_path = "rds/${var.db_identifier}/master"
  description = "Master credentials for ${var.db_identifier} RDS instance"
  kms_key_id  = aws_kms_key.database_secrets.arn

  secret_value = jsonencode({
    username = var.db_master_username
    password = random_password.db_master.result
    engine   = "postgres"
    host     = var.db_endpoint
    port     = 5432
    dbname   = var.db_name
  })

  rotation_enabled = true
  rotation_days    = 30
  recovery_window  = 30
}

# Generate a strong random password
resource "random_password" "db_master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}|:,.<>?"
}

# Application-specific database user
module "app_db_credentials" {
  source       = "./modules/secret"
  project_name = var.project_name
  secret_path  = "rds/${var.db_identifier}/app"
  description  = "Application credentials for ${var.db_identifier}"
  kms_key_id   = aws_kms_key.database_secrets.arn

  secret_value = jsonencode({
    username = "app_user"
    password = random_password.app_db.result
    engine   = "postgres"
    host     = var.db_endpoint
    port     = 5432
    dbname   = var.db_name
  })

  rotation_enabled = true
  rotation_days    = 30
}
```

## Automatic Rotation with Lambda

Set up Lambda-based rotation for database credentials:

```hcl
# Lambda rotation function
resource "aws_lambda_function" "rds_rotator" {
  filename         = var.rotator_package
  function_name    = "${var.project_name}-rds-secret-rotator"
  role             = aws_iam_role.rotator.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.12"
  timeout          = 300
  source_code_hash = filebase64sha256(var.rotator_package)

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.rotator.id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }
}

# Allow Secrets Manager to invoke the rotation Lambda
resource "aws_lambda_permission" "secrets_manager" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rds_rotator.function_name
  principal     = "secretsmanager.amazonaws.com"
}

# Attach the rotation function to the secret
resource "aws_secretsmanager_secret_rotation" "rds" {
  secret_id           = module.rds_master_password.secret_id
  rotation_lambda_arn = aws_lambda_function.rds_rotator.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# IAM role for the rotation Lambda
resource "aws_iam_role" "rotator" {
  name = "${var.project_name}-secret-rotator"

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
  name = "secret-rotator-policy"
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
        Resource = module.rds_master_password.secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = aws_kms_key.database_secrets.arn
      }
    ]
  })
}
```

## Application Access Policies

Grant applications access to only the secrets they need:

```hcl
# Policy for the web application - only reads specific secrets
resource "aws_iam_policy" "web_app_secrets" {
  name        = "${var.project_name}-web-app-secrets"
  description = "Allow web app to read its secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          module.app_db_credentials.secret_arn,
          module.api_key_stripe.secret_arn,
          module.jwt_signing_key.secret_arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.database_secrets.arn,
          aws_kms_key.api_secrets.arn,
          aws_kms_key.app_secrets.arn,
        ]
      }
    ]
  })
}

# Policy for the background worker - different set of secrets
resource "aws_iam_policy" "worker_secrets" {
  name        = "${var.project_name}-worker-secrets"
  description = "Allow worker to read its secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          module.app_db_credentials.secret_arn,
          module.sqs_credentials.secret_arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.database_secrets.arn,
        ]
      }
    ]
  })
}
```

## Parameter Store for Configuration

Not everything needs to be a secret. Use Parameter Store for non-sensitive configuration:

```hcl
# Non-sensitive configuration in Parameter Store
resource "aws_ssm_parameter" "config" {
  for_each = var.app_config_parameters

  name        = "/${var.project_name}/${var.environment}/${each.key}"
  description = each.value.description
  type        = each.value.is_secret ? "SecureString" : "String"
  value       = each.value.value
  key_id      = each.value.is_secret ? aws_kms_key.app_secrets.arn : null

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Audit Logging

Track all secret access with CloudTrail:

```hcl
resource "aws_cloudwatch_log_metric_filter" "secret_access" {
  name           = "${var.project_name}-secret-access"
  pattern        = "{ ($.eventSource = \"secretsmanager.amazonaws.com\") && ($.eventName = \"GetSecretValue\") }"
  log_group_name = var.cloudtrail_log_group_name

  metric_transformation {
    name      = "SecretAccessCount"
    namespace = "${var.project_name}/Security"
    value     = "1"
  }
}

# Alert on unusual secret access patterns
resource "aws_cloudwatch_metric_alarm" "unusual_secret_access" {
  alarm_name          = "${var.project_name}-unusual-secret-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SecretAccessCount"
  namespace           = "${var.project_name}/Security"
  period              = 3600
  statistic           = "Sum"
  threshold           = var.secret_access_threshold
  alarm_description   = "Unusual number of secret access events detected"
  alarm_actions       = [var.security_sns_topic_arn]
}
```

For securing TLS certificates alongside your secrets, see [building a certificate management infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-certificate-management-infrastructure-with-terraform/view).

## Wrapping Up

Secrets management is not optional for production systems. The infrastructure we built gives you encrypted storage with customer-managed KMS keys, automatic rotation for database credentials, fine-grained IAM access policies, and audit logging for compliance. Terraform makes this entire setup reproducible and auditable through code reviews. The most important principle is least privilege: every application should only have access to the secrets it actually needs, nothing more. Start with your database credentials, add API keys, and then extend to cover every secret in your organization.
