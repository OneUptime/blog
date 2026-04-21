# How to Create AWS Systems Manager Parameters with OpenTofu - Systems Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, SSM, Systems Manager, Configuration

Description: Learn how to create and manage AWS Systems Manager Parameter Store parameters for secure configuration management using OpenTofu.

## Introduction

AWS Systems Manager Parameter Store provides secure, hierarchical storage for configuration data and secrets. This guide covers creating String, StringList, and SecureString parameters using OpenTofu.

## Step 1: Create String Parameters

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Simple string parameter

resource "aws_ssm_parameter" "app_env" {
  name        = "/myapp/production/environment"
  type        = "String"
  value       = "production"
  description = "Application environment name"
  tier        = "Standard"  # Standard (free, up to 4KB) or Advanced (paid, up to 8KB)

  tags = {
    Environment = "production"
    Service     = "myapp"
  }
}

# Application configuration as JSON
resource "aws_ssm_parameter" "app_config" {
  name  = "/myapp/production/config"
  type  = "String"
  value = jsonencode({
    feature_flags = {
      new_dashboard = true
      beta_api      = false
    }
    cache_ttl = 300
    max_connections = 100
  })
}
```

## Step 2: Create SecureString Parameters

```hcl
# Encrypted secret using KMS
resource "aws_ssm_parameter" "db_password" {
  name        = "/myapp/production/db/password"
  type        = "SecureString"
  value       = var.db_password
  key_id      = var.kms_key_id  # Use "alias/aws/ssm" for AWS managed key
  description = "Production database password"

  lifecycle {
    ignore_changes = [value]  # Don't overwrite manually rotated values
  }
}

# API key for third-party service
resource "aws_ssm_parameter" "api_key" {
  name   = "/myapp/production/integrations/stripe-api-key"
  type   = "SecureString"
  value  = var.stripe_api_key
  key_id = var.kms_key_id
}
```

## Step 3: Create StringList Parameter

```hcl
resource "aws_ssm_parameter" "allowed_origins" {
  name  = "/myapp/production/cors/allowed-origins"
  type  = "StringList"
  value = join(",", ["https://app.example.com", "https://admin.example.com"])
}
```

## Step 4: Read Parameters in Other Resources

```hcl
# Data source to read an existing parameter
data "aws_ssm_parameter" "db_host" {
  name            = "/myapp/production/db/host"
  with_decryption = true  # Decrypt SecureString values (default: true)
}

# Use in a Lambda environment variable
resource "aws_lambda_function" "app" {
  function_name = "my-app"
  # ...

  environment {
    variables = {
      DB_HOST = data.aws_ssm_parameter.db_host.value
    }
  }
}
```

## Step 5: Create Parameter with IAM Policy

```hcl
data "aws_caller_identity" "current" {}

# IAM policy to allow reading specific path
resource "aws_iam_policy" "read_app_params" {
  name = "read-app-parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/myapp/production/*"
      },
      {
        Effect   = "Allow"
        Action   = "kms:Decrypt"
        Resource = var.kms_key_arn
      }
    ]
  })
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created AWS Systems Manager parameters using OpenTofu for application configuration management. Use Parameter Store for configuration values and non-critical secrets. For sensitive credentials requiring automatic rotation, prefer AWS Secrets Manager. Organize parameters using a hierarchical naming convention like `/application/environment/component/parameter`.
