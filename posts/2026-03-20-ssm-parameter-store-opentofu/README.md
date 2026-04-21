# How to Configure AWS Systems Manager Parameter Store with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SSM, Parameter Store, Secrets Management, Configuration, Infrastructure as Code

Description: Learn how to store and retrieve application configuration and secrets using AWS Systems Manager Parameter Store with OpenTofu, including SecureString parameters encrypted with KMS.

## Introduction

AWS Systems Manager Parameter Store provides secure, hierarchical storage for configuration data and secrets. It supports plain text (String, StringList) and encrypted (SecureString) parameter types, can be referenced by AWS services such as EC2, ECS, Lambda, CloudFormation, and CodeBuild, and offers no-additional-charge standard parameters, paid advanced parameters for larger values and parameter policies, plus an optional higher-throughput setting.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with SSM Parameter Store permissions and KMS permissions for the customer-managed key

## Step 1: Create Plain Text Configuration Parameters

```hcl
# Application configuration parameters (non-sensitive)

resource "aws_ssm_parameter" "app_environment" {
  name  = "/${var.project_name}/${var.environment}/config/APP_ENV"
  type  = "String"
  value = var.environment

  tags = {
    Name        = "${var.project_name}-app-env"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/${var.environment}/config/DATABASE_HOST"
  type  = "String"
  value = var.database_host  # Non-sensitive hostname, not credentials
}

# StringList for multi-value parameters
resource "aws_ssm_parameter" "allowed_origins" {
  name  = "/${var.project_name}/${var.environment}/config/ALLOWED_ORIGINS"
  type  = "StringList"
  value = join(",", var.allowed_origins)  # e.g., "https://app.example.com,https://api.example.com"
}
```

## Step 2: Create Encrypted SecureString Parameters

```hcl
resource "aws_ssm_parameter" "database_password" {
  name   = "/${var.project_name}/${var.environment}/secrets/DATABASE_PASSWORD"
  type   = "SecureString"
  value  = var.database_password  # Declare this input variable as sensitive in OpenTofu
  key_id = var.kms_key_arn        # Use customer-managed KMS key

  tags = {
    Name        = "${var.project_name}-db-password"
    Environment = var.environment
    Sensitive   = "true"
  }

  lifecycle {
    ignore_changes = [value]  # Don't overwrite if value changed outside OpenTofu
  }
}

resource "aws_ssm_parameter" "api_key" {
  name   = "/${var.project_name}/${var.environment}/secrets/EXTERNAL_API_KEY"
  type   = "SecureString"
  value  = var.external_api_key
  key_id = var.kms_key_arn

  tags = {
    Name = "${var.project_name}-api-key"
  }

  lifecycle {
    ignore_changes = [value]
  }
}
```

## Step 3: IAM Policy for Parameter Access

```hcl
# Policy for application to read parameters
resource "aws_iam_policy" "ssm_read" {
  name = "${var.project_name}-ssm-read"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
        ]
      },
      {
        # Required for SecureString parameters with customer-managed KMS key
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = var.kms_key_arn
      }
    ]
  })
}
```

## Step 4: Read Parameters in Application Code

```python
import boto3
import os

ssm = boto3.client('ssm', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

def get_parameters(path, with_decryption):
    paginator = ssm.get_paginator('get_parameters_by_path')
    parameters = []

    for page in paginator.paginate(
        Path=path,
        Recursive=True,
        WithDecryption=with_decryption
    ):
        parameters.extend(page['Parameters'])

    return parameters

def get_config():
    """Load all parameters for this service from Parameter Store."""
    prefix = f"/{os.environ['PROJECT_NAME']}/{os.environ['ENVIRONMENT']}"

    # Get all parameters under the prefix
    config_parameters = get_parameters(f"{prefix}/config/", False)

    # Get secrets
    secret_parameters = get_parameters(f"{prefix}/secrets/", True)  # Required for SecureString

    config = {}
    for param in config_parameters + secret_parameters:
        # Extract the parameter name without the path prefix
        key = param['Name'].split('/')[-1]
        config[key] = param['Value']

    return config
```

## Step 5: Use Parameters in Lambda

```hcl
# Lambda environment variables that tell the function which parameters to load
resource "aws_lambda_function" "app" {
  # ...
  environment {
    variables = {
      # Lambda stores this as a literal path; the function code fetches the parameter
      DB_PASSWORD_SSM_PATH = aws_ssm_parameter.database_password.name
      CONFIG_PREFIX        = "/${var.project_name}/${var.environment}"
    }
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Read a parameter value
aws ssm get-parameter \
  --name "/my-project/prod/secrets/DATABASE_PASSWORD" \
  --with-decryption \
  --query 'Parameter.Value' --output text
```

## Conclusion

Use a hierarchical naming convention like `/{project}/{environment}/{type}/{name}` to organize parameters and enable path-based IAM policies that grant least-privilege access. Use `lifecycle { ignore_changes = [value] }` for secrets managed outside OpenTofu to prevent accidental overwrites during deployments. For Lambda, load parameters at startup using `GetParametersByPath` or the AWS Parameters and Secrets Lambda Extension; for ECS, either use native SSM parameter injection in the task definition or load a path at startup to reduce SSM API calls.
