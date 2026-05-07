# How to Avoid Hardcoding Values in OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Best Practice, Variable, Configuration, Infrastructure as Code

Description: Learn how to identify and eliminate hardcoded values in OpenTofu configurations by replacing them with variables, locals, and data sources.

## Introduction

Hardcoded values in OpenTofu configurations create configurations that work in exactly one context. When you hardcode an account ID, region, bucket name, or instance type, the configuration cannot be reused across environments or accounts without manual editing. This post shows how to replace hardcoded values with proper parameterization.

## Identifying Hardcoded Values

Common categories of hardcoded values to avoid.

```hcl
# BAD: Everything hardcoded

resource "aws_s3_bucket" "app" {
  bucket = "my-company-app-prod-us-east-1"  # hardcoded name
  region = "us-east-1"                       # hardcoded region

  tags = {
    Environment = "prod"                     # hardcoded environment
    AccountId   = "123456789012"             # hardcoded account ID
    Owner       = "platform-team"            # hardcoded owner
  }
}
```

## Replace with Variables

Move configurable values into variables.

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"
}

variable "team_name" {
  type        = string
  description = "Name of the owning team for tagging"
}

variable "app_name" {
  type        = string
  description = "Application name used in resource naming and tags"
}

# provider.tf
provider "aws" {
  region = var.region
}
```

## Replace with Data Sources

Use data sources for values that can be looked up dynamically.

```hcl
# Get account ID dynamically and reference the configured region when needed
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# GOOD: Dynamic values from data sources
resource "aws_s3_bucket" "app" {
  bucket = "my-company-app-${var.environment}-${data.aws_region.current.region}"

  tags = {
    Environment = var.environment
    AccountId   = data.aws_caller_identity.current.account_id
    Owner       = var.team_name
    ManagedBy   = "opentofu"
  }
}
```

## Replace with Locals for Computed Values

Use locals for values derived from other inputs.

```hcl
# locals.tf
locals {
  name_prefix = "${var.app_name}-${var.environment}"

  common_tags = {
    Application = var.app_name
    Environment = var.environment
    Owner       = var.team_name
    ManagedBy   = "opentofu"
  }

  is_production = var.environment == "prod"
}

resource "aws_db_instance" "main" {
  identifier                  = "${local.name_prefix}-db"
  allocated_storage           = 20
  engine                      = "postgres"
  instance_class              = "db.t3.micro"
  username                    = "appadmin"
  manage_master_user_password = true
  skip_final_snapshot         = true
  multi_az                    = local.is_production  # computed from environment
  deletion_protection         = local.is_production

  tags = local.common_tags  # reuse computed tags
}
```

## Replace AMI IDs with Data Sources

AMI IDs are region-specific and change over time.

```hcl
# BAD: Hardcoded AMI
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"  # region-specific, becomes outdated
  instance_type = "t3.micro"
}

# GOOD: Dynamic AMI lookup
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_2.id  # selects the latest matching AMI in the configured region
  instance_type = "t3.micro"
}
```

## Variable Files Per Environment

Provide environment-specific values through var files.

```hcl
# environments/dev.tfvars
environment = "dev"
team_name   = "platform"
app_name    = "myapp"

# environments/prod.tfvars
environment = "prod"
team_name   = "platform"
app_name    = "myapp"
```

```bash
# Apply with environment-specific values
tofu apply -var-file=environments/dev.tfvars
tofu apply -var-file=environments/prod.tfvars
```

## Summary

Hardcoded values reduce configuration reusability and create maintenance burden when values change. Replace hardcoded provider regions with variables such as `var.region`, use the `aws_region` data source when you need the configured region inside expressions, replace account IDs with `aws_caller_identity`, use `aws_ami` data source lookups for region-specific machine images, and provide environment-specific values with variables and var files. Use locals to derive repeated computed values from these inputs. The result is a configuration that works across any environment or account by providing a different set of variable values.
