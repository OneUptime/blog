# How to Handle Secret Rotation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Secrets Manager, Security, Secret Rotation

Description: Implement automated secret rotation with Terraform using AWS Secrets Manager, Lambda rotation functions, and patterns for database credentials and API keys.

---

Secrets that never change are secrets waiting to be compromised. Whether it is a database password, an API key, or a TLS certificate, regular rotation limits the window of exposure if a secret is leaked. AWS Secrets Manager provides built-in rotation capabilities, and Terraform can set up the entire rotation infrastructure. But there are some important nuances around how Terraform interacts with rotating secrets that you need to understand.

This guide covers implementing secret rotation with Terraform, including the rotation Lambda functions, Secrets Manager configuration, and patterns for handling the Terraform state implications.

## The Terraform and Rotation Tension

There is a fundamental tension between Terraform and secret rotation. Terraform wants to own the state of every resource, including the secret value. But rotation changes the secret value outside of Terraform. If Terraform detects the change, it will try to revert to the old value.

The solution is to have Terraform set up the rotation infrastructure but not manage the secret value after initial creation.

```hcl
# Create the secret
resource "aws_secretsmanager_secret" "database" {
  name        = "${var.project}/database/credentials"
  description = "Database credentials with automatic rotation"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Name = "${var.project}-database-credentials"
  }
}

# Set the initial secret value
resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id

  secret_string = jsonencode({
    username = "admin"
    password = random_password.initial.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = aws_db_instance.main.db_name
  })

  # Critical: ignore changes after initial creation
  # The rotation function will update the value
  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "random_password" "initial" {
  length  = 32
  special = true
}
```

The `lifecycle { ignore_changes = [secret_string] }` block is essential. Without it, Terraform would detect the rotation-changed secret and try to overwrite it with the original value.

## Set Up RDS Credential Rotation

AWS provides pre-built Lambda functions for rotating RDS credentials:

```hcl
# Configure rotation for the database secret
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30
    # Or use a schedule expression for more control
    # schedule_expression = "rate(30 days)"
  }
}

# Lambda function for rotation
resource "aws_lambda_function" "rotation" {
  filename         = data.archive_file.rotation_lambda.output_path
  function_name    = "${var.project}-secret-rotation"
  role             = aws_iam_role.rotation.arn
  handler          = "lambda_function.lambda_handler"
  source_code_hash = data.archive_file.rotation_lambda.output_base64sha256
  runtime          = "python3.12"
  timeout          = 300

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.rotation_lambda.id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }

  tags = {
    Name = "${var.project}-secret-rotation"
  }
}

# Allow Secrets Manager to invoke the Lambda
resource "aws_lambda_permission" "secrets_manager" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
  source_arn    = aws_secretsmanager_secret.database.arn
}
```

## IAM Role for the Rotation Lambda

The rotation function needs permissions to manage the secret and connect to the database:

```hcl
resource "aws_iam_role" "rotation" {
  name = "${var.project}-secret-rotation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "rotation" {
  name = "secret-rotation-policy"
  role = aws_iam_role.rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Access to the specific secret
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.database.arn
      },
      {
        # Permission to generate random passwords
        Effect = "Allow"
        Action = "secretsmanager:GetRandomPassword"
        Resource = "*"
      },
      {
        # KMS access for secret encryption
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.secrets.arn
      },
      {
        # VPC networking permissions
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
      },
      {
        # CloudWatch Logs for debugging
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

## Network Configuration for Rotation

The rotation Lambda needs network access to both Secrets Manager and the database:

```hcl
# Security group for the rotation Lambda
resource "aws_security_group" "rotation_lambda" {
  name        = "${var.project}-rotation-lambda-sg"
  description = "Security group for secret rotation Lambda"
  vpc_id      = aws_vpc.main.id

  # Allow outbound to database
  egress {
    description     = "PostgreSQL to database"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  # Allow outbound to Secrets Manager VPC endpoint
  egress {
    description     = "HTTPS to Secrets Manager endpoint"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.vpc_endpoints.id]
  }

  tags = { Name = "${var.project}-rotation-lambda-sg" }
}

# Add ingress rule to database security group
resource "aws_vpc_security_group_ingress_rule" "db_from_rotation" {
  security_group_id            = aws_security_group.database.id
  description                  = "PostgreSQL from rotation Lambda"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.rotation_lambda.id
}

# VPC endpoint for Secrets Manager (if not already created)
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]
}
```

## Multi-User Rotation Strategy

For zero-downtime rotation, use the alternating users strategy. The rotation function maintains two database users and alternates between them:

```hcl
# Master secret (used by rotation function to create/update users)
resource "aws_secretsmanager_secret" "database_master" {
  name        = "${var.project}/database/master-credentials"
  description = "Master credentials for managing rotation users"
  kms_key_id  = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_version" "database_master" {
  secret_id = aws_secretsmanager_secret.database_master.id

  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = aws_db_instance.main.password
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = aws_db_instance.main.db_name
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Application secret (alternating users strategy)
resource "aws_secretsmanager_secret" "app_database" {
  name        = "${var.project}/database/app-credentials"
  description = "Application database credentials with multi-user rotation"
  kms_key_id  = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_rotation" "app_database" {
  secret_id           = aws_secretsmanager_secret.app_database.id
  rotation_lambda_arn = aws_lambda_function.multi_user_rotation.arn

  rotation_rules {
    automatically_after_days = 7  # More frequent rotation for app credentials
  }
}
```

## Rotation for Non-Database Secrets

For API keys and other non-database secrets, you need custom rotation logic:

```hcl
# API key secret with custom rotation
resource "aws_secretsmanager_secret" "api_key" {
  name        = "${var.project}/external-api/key"
  description = "External API key with rotation"
  kms_key_id  = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_rotation" "api_key" {
  secret_id           = aws_secretsmanager_secret.api_key.id
  rotation_lambda_arn = aws_lambda_function.api_key_rotation.arn

  rotation_rules {
    automatically_after_days = 90
  }
}
```

## Monitoring Rotation

Track rotation success and failures:

```hcl
# Alert on rotation failures
resource "aws_cloudwatch_metric_alarm" "rotation_failure" {
  alarm_name          = "secret-rotation-failure"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RotationFailed"
  namespace           = "AWS/SecretsManager"
  period              = 86400  # Check daily
  statistic           = "Sum"
  threshold           = 0

  alarm_actions = [aws_sns_topic.security_alerts.arn]
  alarm_description = "A secret rotation has failed"
}

# Alert on secrets approaching expiration
resource "aws_cloudwatch_metric_alarm" "secret_expiring" {
  alarm_name          = "secret-expiring-soon"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysSinceLastRotation"
  namespace           = "CustomMetrics/SecretsManager"
  period              = 86400
  statistic           = "Maximum"
  threshold           = 25  # Alert 5 days before 30-day rotation
}
```

## Summary

Secret rotation with Terraform requires understanding the boundary between what Terraform manages (the rotation infrastructure) and what it should not manage (the actual secret values after initial creation). Use `lifecycle { ignore_changes }` to prevent Terraform from reverting rotated secrets. Set up the rotation Lambda with proper network access and IAM permissions. Monitor rotation to catch failures early. The result is a system where secrets are automatically rotated on schedule, and Terraform maintains the infrastructure that makes it all work.

For more on secrets in Terraform, see [how to handle Terraform sensitive output values](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-sensitive-output-values/view).
