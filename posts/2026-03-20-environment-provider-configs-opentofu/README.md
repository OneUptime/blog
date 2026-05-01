# How to Set Up Environment-Specific Provider Configurations in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider, Environment Configuration, AWS, Multi-Account, Infrastructure as Code

Description: Learn how to configure environment-specific provider settings in OpenTofu to deploy to different AWS accounts, regions, or cloud credentials for each environment.

---

Environment-specific provider configurations enable deploying the same OpenTofu configuration to different cloud accounts, regions, or with different credentials per environment. This is essential for multi-account AWS setups where dev, staging, and production live in separate accounts.

## Multi-Account AWS Setup

```hcl
# providers.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

variable "environment" {
  type = string
}

variable "external_id" {
  type    = string
  default = null
}

locals {
  account_ids = {
    development = "111111111111"
    staging     = "222222222222"
    production  = "333333333333"
  }

  regions = {
    development = "us-east-1"
    staging     = "us-east-1"
    production  = "us-east-1"
  }
}

# Provider assumes a role in the target account
provider "aws" {
  region = local.regions[var.environment]

  assume_role {
    role_arn     = "arn:aws:iam::${local.account_ids[var.environment]}:role/TerraformDeployRole"
    session_name = "OpenTofu-${var.environment}"
    external_id  = var.external_id
  }

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "opentofu"
    }
  }
}
```

## Using backend-config for Environment Backends

```bash
# Initialize with environment-specific backend config
tofu init \
  -backend-config="bucket=my-state-${ENVIRONMENT}" \
  -backend-config="key=${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=tofu-lock-${ENVIRONMENT}"
```

## Multiple Provider Aliases

```hcl
# multi_region.tf
# Deploy to primary region
provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

# Deploy to DR region with same account
provider "aws" {
  alias  = "dr"
  region = var.dr_region
}

# Use provider aliases in resources
resource "aws_s3_bucket" "primary" {
  provider      = aws.primary
  bucket_prefix = "data-primary-"
}

resource "aws_s3_bucket" "dr" {
  provider      = aws.dr
  bucket_prefix = "data-dr-replica-"
}
```

## Dynamic Provider Configuration via Variables

```hcl
# dynamic_providers.tf
variable "provider_configs" {
  description = "Provider configurations per environment"
  type = object({
    region          = string
    assume_role_arn = optional(string)
    profile         = optional(string)
  })
}

provider "aws" {
  region  = var.provider_configs.region
  profile = var.provider_configs.profile

  dynamic "assume_role" {
    for_each = var.provider_configs.assume_role_arn != null ? [1] : []
    content {
      role_arn = var.provider_configs.assume_role_arn
    }
  }
}
```

## Best Practices

- Use role assumption rather than environment-specific access keys - it's more secure and easier to audit.
- Set `external_id` when a third party is assuming the role, to help prevent confused deputy attacks.
- Use `default_tags` in the provider to ensure resources that support tagging in an environment have consistent tags.
- Pass provider configuration through variables rather than hard-coding account IDs and role ARNs in provider blocks.
- Use separate provider configurations per environment directory rather than complex conditional logic in a single config.
