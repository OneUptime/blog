# How to Use Dynamic Provider Configuration in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, Terraform, IaC, DevOps, Provider

Description: Learn how to create dynamic provider configurations in OpenTofu using variables, locals, and for_each on provider blocks to manage multiple provider instances.

## Introduction

Dynamic provider configuration in OpenTofu allows you to create provider instances based on data rather than hardcoding each one. Using `for_each` on aliased provider blocks (available in OpenTofu 1.6+) or combining variables with locals enables flexible, data-driven provider setups that scale from a few accounts to many.

## Provider Configuration from Variables

Use variables to control provider behavior:

```hcl
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "assume_role_arn" {
  type    = string
  default = ""
}

provider "aws" {
  region = var.aws_region

  # Conditionally configure assume_role
  dynamic "assume_role" {
    for_each = var.assume_role_arn != "" ? [var.assume_role_arn] : []
    content {
      role_arn = assume_role.value
    }
  }
}
```

## Dynamic Default Tags

Build default tags dynamically from locals:

```hcl
locals {
  deployment_id = "deploy-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  common_tags = merge(
    {
      ManagedBy   = "opentofu"
      Environment = var.environment
      Region      = var.region
    },
    var.additional_tags,
    # Add deployment metadata in CI
    var.ci_build_id != "" ? { CIBuildId = var.ci_build_id } : {}
  )
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}
```

## for_each on Provider Blocks (OpenTofu 1.6+)

OpenTofu 1.6 introduced `for_each` on provider blocks for dynamic multi-instance providers:

```hcl
variable "aws_regions" {
  type = map(object({
    vpc_cidr_block = string
  }))
  default = {
    "us-east-1" = {
      vpc_cidr_block = "10.0.0.0/16"
    }
    "us-west-2" = {
      vpc_cidr_block = "10.1.0.0/16"
    }
    "eu-west-1" = {
      vpc_cidr_block = "10.2.0.0/16"
    }
  }
}

# Create one provider instance per region

provider "aws" {
  alias    = "by_region"
  for_each = var.aws_regions
  region   = each.key
}
```

Then reference them:

```hcl
resource "aws_vpc" "regional" {
  for_each = {
    for region, config in var.aws_regions : region => config
    if config != null
  }
  provider = aws.by_region[each.key]

  cidr_block = each.value.vpc_cidr_block
}
```

## for_each for Multi-Account Providers

```hcl
variable "accounts" {
  type = map(object({
    account_id  = string
    environment = string
  }))
  default = {
    prod = {
      account_id  = "111111111111"
      environment = "production"
    }
    staging = {
      account_id  = "222222222222"
      environment = "staging"
    }
  }
}

provider "aws" {
  alias    = "by_account"
  for_each = var.accounts
  region   = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${each.value.account_id}:role/opentofu-deploy"
    session_name = "opentofu-${each.key}"
  }

  default_tags {
    tags = {
      Environment = each.value.environment
      ManagedBy   = "opentofu"
    }
  }
}
```

## Conditional Provider Features

Enable or disable provider features for LocalStack or other AWS-compatible test environments:

```hcl
provider "aws" {
  region = var.region

  # Skip some AWS API checks when using LocalStack or another test endpoint
  skip_credentials_validation = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  skip_metadata_api_check     = var.use_localstack

  # Use different endpoints in LocalStack/testing
  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      s3  = "http://localhost:4566"
      ec2 = "http://localhost:4566"
      iam = "http://localhost:4566"
    }
  }
}
```

## Provider Configuration with Sensitive Data

Use environment variables for credentials and variables for non-secret provider settings such as profiles:

```hcl
# providers.tf
provider "aws" {
  region = var.region

  # Credentials from environment variables (recommended)
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN

  # Or from a profile
  profile = var.aws_profile != "" ? var.aws_profile : null
}

# Variable for optional profile selection
variable "aws_profile" {
  type    = string
  default = ""
}
```

## Validating Provider Configuration

```hcl
variable "region" {
  type = string

  validation {
    condition = contains(
      ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
      var.region
    )
    error_message = "Region must be one of us-east-1, us-west-2, eu-west-1, or ap-southeast-1."
  }
}
```

## Conclusion

Dynamic provider configurations let you drive provider instances from data rather than hardcoding each configuration. Use variables and locals to build provider configurations dynamically, conditional `dynamic` blocks for optional provider features, and `for_each` on aliased provider blocks (OpenTofu 1.6+) to create multiple provider instances from a map or set. This approach is especially valuable for multi-account or multi-region organizations where the number of provider instances grows over time.
