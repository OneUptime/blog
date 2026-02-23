# How to Create Systems Manager Parameters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Systems Manager, Parameter Store, Infrastructure as Code

Description: Learn how to create and manage AWS Systems Manager Parameter Store parameters with Terraform, including string, encrypted, and hierarchical parameters with IAM access control.

---

AWS Systems Manager Parameter Store is the go-to service for storing configuration values, feature flags, database connection strings, and other settings that your applications need at runtime. Unlike Secrets Manager, which is designed specifically for secrets with automatic rotation, Parameter Store is simpler, cheaper (the standard tier is free), and works well for both sensitive and non-sensitive configuration data.

Terraform makes it easy to define your parameters as code, version-control them, and deploy them consistently across environments. This guide covers creating different parameter types, organizing them with hierarchies, encrypting sensitive values, and controlling access with IAM.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## String Parameters

The simplest parameter type stores a plain text string.

```hcl
# Simple string parameter
resource "aws_ssm_parameter" "app_environment" {
  name  = "/myapp/production/environment"
  type  = "String"
  value = "production"

  description = "Application environment name"

  tags = {
    Environment = "production"
    Service     = "myapp"
  }
}

# Parameter for a configuration URL
resource "aws_ssm_parameter" "api_endpoint" {
  name  = "/myapp/production/api_endpoint"
  type  = "String"
  value = "https://api.example.com/v2"

  description = "External API endpoint URL"

  tags = {
    Environment = "production"
    Service     = "myapp"
  }
}

# Feature flag as a parameter
resource "aws_ssm_parameter" "feature_new_ui" {
  name  = "/myapp/production/features/new_ui_enabled"
  type  = "String"
  value = "true"

  description = "Feature flag for the new UI design"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## StringList Parameters

StringList stores comma-separated values. Useful for lists like allowed IP addresses or feature flag targets.

```hcl
# A list of allowed CIDR blocks
resource "aws_ssm_parameter" "allowed_cidrs" {
  name  = "/myapp/production/network/allowed_cidrs"
  type  = "StringList"
  value = "10.0.0.0/16,172.16.0.0/12,192.168.0.0/16"

  description = "Comma-separated list of allowed CIDR blocks"
}

# A list of enabled regions
resource "aws_ssm_parameter" "enabled_regions" {
  name  = "/myapp/production/regions"
  type  = "StringList"
  value = "us-east-1,us-west-2,eu-west-1"

  description = "Regions where the application is deployed"
}
```

## SecureString Parameters

SecureString parameters are encrypted with KMS. Use them for database passwords, API keys, and other sensitive values.

```hcl
# Encrypted parameter using the default AWS managed key
resource "aws_ssm_parameter" "db_password" {
  name  = "/myapp/production/database/password"
  type  = "SecureString"
  value = "change-me-in-console"  # See note below about managing secrets

  description = "Production database password"

  tags = {
    Environment = "production"
    Sensitive   = "true"
  }

  # Prevent Terraform from showing the value in plan output
  lifecycle {
    ignore_changes = [value]
  }
}
```

A note about storing secrets in Terraform: the parameter value ends up in your state file, which might not be acceptable for your security requirements. A common pattern is to create the parameter with a placeholder value in Terraform and then update the actual value manually or through a separate secrets management workflow.

```hcl
# Create with placeholder, update manually after
resource "aws_ssm_parameter" "api_key" {
  name  = "/myapp/production/external_api_key"
  type  = "SecureString"
  value = "placeholder-update-after-creation"

  description = "API key for the external payment service"

  lifecycle {
    ignore_changes = [value]  # Don't overwrite manual updates
  }
}
```

## Using a Custom KMS Key

By default, SecureString uses the AWS managed `aws/ssm` key. For more control, use a customer-managed KMS key.

```hcl
# Customer managed KMS key for parameter encryption
resource "aws_kms_key" "parameter_store" {
  description         = "KMS key for SSM Parameter Store"
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRootAccount"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowSSM"
        Effect = "Allow"
        Principal = {
          Service = "ssm.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "parameter_store" {
  name          = "alias/parameter-store"
  target_key_id = aws_kms_key.parameter_store.key_id
}

data "aws_caller_identity" "current" {}

# SecureString parameter encrypted with the custom key
resource "aws_ssm_parameter" "db_connection_string" {
  name   = "/myapp/production/database/connection_string"
  type   = "SecureString"
  value  = "postgresql://user:password@db.example.com:5432/myapp"
  key_id = aws_kms_key.parameter_store.arn

  description = "Database connection string"

  lifecycle {
    ignore_changes = [value]
  }
}
```

## Hierarchical Parameters

Parameter Store supports a path-based hierarchy using forward slashes. This is powerful because you can grant IAM access to entire subtrees.

```hcl
# Organize parameters by environment and service
locals {
  app_config = {
    "/myapp/production/database/host"     = "db.production.example.com"
    "/myapp/production/database/port"     = "5432"
    "/myapp/production/database/name"     = "myapp_production"
    "/myapp/production/cache/host"        = "cache.production.example.com"
    "/myapp/production/cache/port"        = "6379"
    "/myapp/production/app/log_level"     = "info"
    "/myapp/production/app/max_workers"   = "4"
    "/myapp/production/app/debug_enabled" = "false"
  }
}

# Create all parameters from the map
resource "aws_ssm_parameter" "config" {
  for_each = local.app_config

  name  = each.key
  type  = "String"
  value = each.value

  tags = {
    Environment = "production"
    Service     = "myapp"
    ManagedBy   = "terraform"
  }
}
```

## Multi-Environment Configuration

Use variables to create the same parameter structure across environments.

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "config" {
  type = map(object({
    value  = string
    type   = string
    secure = optional(bool, false)
  }))

  default = {
    "database/host" = {
      value = "db.production.example.com"
      type  = "String"
    }
    "database/port" = {
      value = "5432"
      type  = "String"
    }
    "database/password" = {
      value  = "placeholder"
      type   = "SecureString"
      secure = true
    }
    "app/log_level" = {
      value = "info"
      type  = "String"
    }
    "app/max_connections" = {
      value = "100"
      type  = "String"
    }
  }
}

# Create parameters for the environment
resource "aws_ssm_parameter" "env_config" {
  for_each = var.config

  name  = "/myapp/${var.environment}/${each.key}"
  type  = each.value.type
  value = each.value.value

  # Use custom KMS key for secure parameters
  key_id = each.value.type == "SecureString" ? aws_kms_key.parameter_store.arn : null

  lifecycle {
    # Don't overwrite secrets that were updated outside Terraform
    ignore_changes = [value]
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Advanced Tier Parameters

The standard tier has a 4 KB limit and caps at 10,000 parameters per region. The advanced tier supports 8 KB values and allows parameter policies (like expiration notifications). Advanced tier parameters cost money.

```hcl
# Advanced tier parameter for a large configuration blob
resource "aws_ssm_parameter" "large_config" {
  name  = "/myapp/production/app/large_config"
  type  = "String"
  tier  = "Advanced"
  value = jsonencode({
    feature_flags = {
      new_checkout   = true
      beta_dashboard = false
      v2_api         = true
    }
    rate_limits = {
      default     = 1000
      premium     = 5000
      enterprise  = -1
    }
    supported_locales = ["en-US", "en-GB", "de-DE", "fr-FR", "ja-JP"]
  })

  description = "Application configuration as JSON"
}
```

## IAM Access Control

Control which services and users can read which parameters using IAM policies. The path hierarchy makes this clean.

```hcl
# Policy that allows reading all parameters under /myapp/production/
resource "aws_iam_policy" "read_app_params" {
  name = "read-myapp-production-params"

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
        Resource = "arn:aws:ssm:us-east-1:${data.aws_caller_identity.current.account_id}:parameter/myapp/production/*"
      },
      {
        # Also need KMS decrypt for SecureString parameters
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.parameter_store.arn
      }
    ]
  })
}

# More restrictive policy - only database parameters
resource "aws_iam_policy" "read_db_params" {
  name = "read-myapp-database-params"

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
        Resource = "arn:aws:ssm:us-east-1:${data.aws_caller_identity.current.account_id}:parameter/myapp/production/database/*"
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = aws_kms_key.parameter_store.arn
      }
    ]
  })
}

# Attach to an ECS task role, Lambda execution role, or EC2 instance profile
resource "aws_iam_role_policy_attachment" "app_params" {
  role       = "my-ecs-task-role"
  policy_arn = aws_iam_policy.read_app_params.arn
}
```

## Reading Parameters in Your Application

Once the parameters are created, your application reads them at startup or runtime. Here is how it works with the AWS SDK in a few languages.

In Python with boto3:

```python
import boto3

ssm = boto3.client('ssm', region_name='us-east-1')

# Get a single parameter
response = ssm.get_parameter(
    Name='/myapp/production/database/host',
    WithDecryption=True  # Decrypts SecureString parameters
)
db_host = response['Parameter']['Value']

# Get all parameters under a path
response = ssm.get_parameters_by_path(
    Path='/myapp/production/',
    Recursive=True,
    WithDecryption=True
)
config = {p['Name']: p['Value'] for p in response['Parameters']}
```

In Node.js:

```javascript
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });

async function loadConfig() {
  const response = await ssm.send(new GetParametersByPathCommand({
    Path: '/myapp/production/',
    Recursive: true,
    WithDecryption: true,
  }));

  const config = {};
  for (const param of response.Parameters) {
    const key = param.Name.replace('/myapp/production/', '');
    config[key] = param.Value;
  }
  return config;
}
```

## Data Source: Reading Parameters in Terraform

You can also read existing parameters in Terraform using data sources. This is useful for referencing parameters created by other Terraform configurations or manually.

```hcl
# Read an existing parameter
data "aws_ssm_parameter" "vpc_id" {
  name = "/infrastructure/production/vpc_id"
}

# Use the parameter value in other resources
resource "aws_security_group" "app" {
  name_prefix = "myapp-"
  vpc_id      = data.aws_ssm_parameter.vpc_id.value

  # ...
}

# Read a SecureString parameter (the value will be decrypted)
data "aws_ssm_parameter" "db_password" {
  name            = "/myapp/production/database/password"
  with_decryption = true
}
```

## Parameter Store vs Secrets Manager

Both services store configuration values, but they are designed for different use cases:

**Use Parameter Store when** you have plain configuration values (endpoints, feature flags, port numbers), you want to store data for free (standard tier), or you need a simple hierarchy for organizing config across services and environments.

**Use Secrets Manager when** you need automatic secret rotation, you need cross-account secret sharing, or you are storing credentials that need to be rotated on a schedule. Secrets Manager costs $0.40 per secret per month.

Many teams use both: Parameter Store for general configuration and Secrets Manager for credentials that need rotation.

## Wrapping Up

Parameter Store is a straightforward, cost-effective way to manage application configuration on AWS. The hierarchical naming convention gives you clean IAM boundaries, and Terraform makes it easy to define parameters alongside the infrastructure they configure. The `ignore_changes` lifecycle rule is your friend for sensitive parameters - let Terraform create the structure, then manage the actual secret values through a separate workflow.

For storing credentials with automatic rotation, check out our guide on [creating Secrets Manager secrets with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-secrets-manager-secrets-with-terraform/view).
