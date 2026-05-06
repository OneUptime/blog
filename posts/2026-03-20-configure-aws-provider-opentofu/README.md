# How to Configure the AWS Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Provider Configuration, Infrastructure as Code, Terraform

Description: Learn how to configure the AWS provider in OpenTofu, including region, authentication, assume role, and default tags settings for production-ready deployments.

## Introduction

The AWS provider is one of the most widely used providers with OpenTofu. Configuring it correctly-with the right region, authentication method, and global tags-sets the foundation for all AWS resources you manage with OpenTofu.

## Minimal Configuration

```hcl
# versions.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  required_version = ">= 1.6.0"
}

# main.tf
provider "aws" {
  region = "us-east-1"
}
```

Run `tofu init` to download the provider, then `tofu plan` to confirm OpenTofu can initialize the provider configuration.

## Setting Default Tags

Apply tags across supported resources without repeating them:

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "opentofu"
      Team        = var.team_name
    }
  }
}
```

These tags are automatically applied to resources that support `tags` in this provider. Matching keys can be overridden per-resource, but provider-level default tags cannot be excluded from a specific resource.

## Assuming an IAM Role

For CI/CD pipelines or cross-account deployments, assume a specific role:

```hcl
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/OpenTofuDeployRole"
    session_name = "opentofu-session"
    # Optional: restrict permissions with a session policy
    # policy = jsonencode({ ... })
  }
}
```

## Multiple Regions with Aliases

Deploy to multiple regions using provider aliases:

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"
  alias  = "us_east"
}

# Secondary region for disaster recovery
provider "aws" {
  region = "eu-west-1"
  alias  = "eu_west"
}

# Use the alias in resource declarations
resource "aws_s3_bucket" "primary" {
  provider = aws.us_east
  bucket   = "my-app-primary"
}

resource "aws_s3_bucket" "replica" {
  provider = aws.eu_west
  bucket   = "my-app-replica"
}
```

## Full Production Configuration

```hcl
# variables.tf
variable "aws_region"   { default = "us-east-1" }
variable "environment"  {}
variable "project_name" {}
variable "deploy_role_arn" {}

# provider.tf
provider "aws" {
  region = var.aws_region

  # Assume the deploy role (no static credentials in code)
  assume_role {
    role_arn     = var.deploy_role_arn
    session_name = "opentofu-${var.environment}"
  }

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "opentofu"
    }
  }

  # Retry transient API errors automatically
  retry_mode    = "standard"
  max_retries   = 5
}
```

## Provider Version Constraints

Pin your provider version to avoid unexpected breaking changes:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # Allow patch updates but not minor/major version bumps
      version = "~> 6.43"
    }
  }
}
```

After running `tofu init`, commit the `.terraform.lock.hcl` file to version control to lock the exact provider version for your team.

## Conclusion

A well-configured AWS provider sets consistent defaults across all your resources, reduces boilerplate tagging, and keeps credentials out of your code. Start with region and default tags, add role assumption for CI/CD pipelines, and use aliases for multi-region deployments.
