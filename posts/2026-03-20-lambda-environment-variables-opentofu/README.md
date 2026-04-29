# How to Configure Lambda Environment Variables with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Environment Variable, KMS, Secret, Infrastructure as Code

Description: Learn how to configure Lambda environment variables with encryption using OpenTofu, including best practices for managing secrets and referencing SSM Parameter Store values.

## Introduction

Lambda environment variables provide configuration to functions at runtime without hardcoding values. AWS encrypts environment variables at rest using KMS. This guide covers setting environment variables, encrypting with customer-managed keys, and best practices for secrets management.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda and KMS permissions

## Step 1: Create a KMS Key for Environment Variable Encryption

```hcl
# Customer-managed KMS key for encrypting Lambda environment variables

resource "aws_kms_key" "lambda_env" {
  description             = "KMS key for Lambda environment variable encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name    = "lambda-env-encryption-key"
    Purpose = "LambdaEnvironment"
  }
}

resource "aws_kms_alias" "lambda_env" {
  name          = "alias/lambda-env-encryption"
  target_key_id = aws_kms_key.lambda_env.key_id
}
```

## Step 2: Create Lambda Function with Environment Variables

```hcl
# Store non-sensitive configuration as plain environment variables
# Store sensitive values in AWS Secrets Manager or SSM Parameter Store
resource "aws_lambda_function" "app" {
  function_name    = "configured-app"
  role             = var.lambda_role_arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256

  # Use CMK to encrypt environment variables at rest
  kms_key_arn = aws_kms_key.lambda_env.arn

  environment {
    variables = {
      # Application configuration
      ENVIRONMENT          = var.environment
      LOG_LEVEL            = var.environment == "prod" ? "WARNING" : "DEBUG"
      APP_REGION           = var.region
      MAX_CONNECTIONS      = "10"
      CACHE_TTL_SECONDS    = "300"

      # References to secrets - store actual secret in Secrets Manager
      # Your function code fetches the secret at runtime using this ARN
      SECRET_ARN           = aws_secretsmanager_secret.app.arn

      # SSM Parameter paths - your function code fetches values at runtime
      DB_CONFIG_PATH       = "/app/${var.environment}/database/config"
      API_KEY_PATH         = "/app/${var.environment}/api/key"

      # Non-sensitive identifiers
      DATABASE_NAME        = var.database_name
      S3_BUCKET            = var.data_bucket
      SQS_QUEUE_URL        = aws_sqs_queue.processing.url
      SNS_TOPIC_ARN        = aws_sns_topic.notifications.arn
    }
  }

  tags = {
    Name        = "configured-app"
    Environment = var.environment
  }
}
```

## Step 3: Create Secrets Manager Secret for Sensitive Values

```hcl
# Store sensitive values in Secrets Manager (not as env vars directly)
resource "aws_secretsmanager_secret" "app" {
  name                    = "/app/${var.environment}/credentials"
  description             = "Application credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
  kms_key_id              = aws_kms_key.lambda_env.arn

  tags = { Name = "app-credentials" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  # Values passed via secret_string are stored in OpenTofu state,
  # so protect your state backend and state access.
  secret_string = jsonencode({
    db_password  = var.db_password
    api_key      = var.api_key
    oauth_secret = var.oauth_secret
  })
}
```

## Step 4: Grant Lambda Access to Secrets Manager

```hcl
resource "aws_iam_role_policy" "secrets_access" {
  name = "lambda-secrets-policy"
  role = var.lambda_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.app.arn
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.lambda_env.arn
      }
    ]
  })
}
```

## Step 5: Fetch Secrets at Runtime

```python
# index.py - Fetch secrets from Secrets Manager at cold start
import os
import json
import boto3
from functools import lru_cache

secrets_client = boto3.client('secretsmanager')

@lru_cache(maxsize=1)
def get_secrets():
    """Fetch secrets once per cold start and cache in memory."""
    response = secrets_client.get_secret_value(
        SecretId=os.environ['SECRET_ARN']
    )
    return json.loads(response['SecretString'])

def handler(event, context):
    secrets = get_secrets()
    db_password = secrets['db_password']
    # Use secrets in your application logic
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Never store actual secret values directly in Lambda environment variables-they can be viewed by users who have permission to read function configuration in the AWS console. Instead, store sensitive values in Secrets Manager or SSM Parameter Store and pass only the ARN or path as environment variables. If you provision secret values with `secret_string`, remember that OpenTofu stores resource attributes in state, so protect your state backend appropriately. Fetch secrets at cold start and cache them in memory to minimize Secrets Manager API calls and latency on subsequent invocations.
