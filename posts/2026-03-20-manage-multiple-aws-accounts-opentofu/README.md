# How to Manage Multiple AWS Accounts with Provider Aliases in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Multi-Account, AWS, Provider Aliases, Infrastructure as Code

Description: Learn how to use OpenTofu provider aliases to manage resources across multiple AWS accounts from a single configuration.

Managing resources across multiple AWS accounts from one OpenTofu configuration is common in multi-account architectures. Provider aliases with `assume_role` let you target different accounts without separate state files or configurations.

## Configuring Multiple Account Providers

```hcl
# Default provider - management account

provider "aws" {
  region = "us-east-1"
}

# Production account
provider "aws" {
  alias  = "production"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.production_account_id}:role/DeploymentRole"
    session_name = "opentofu-production"
  }
}

# Staging account
provider "aws" {
  alias  = "staging"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.staging_account_id}:role/DeploymentRole"
    session_name = "opentofu-staging"
  }
}

# Security account
provider "aws" {
  alias  = "security"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::${var.security_account_id}:role/SecurityReadRole"
    session_name = "opentofu-security"
  }
}
```

## Creating Resources in Specific Accounts

```hcl
# VPC in production account
resource "aws_vpc" "production" {
  provider   = aws.production
  cidr_block = "10.1.0.0/16"
  tags = { Name = "production-vpc" }
}

# VPC in staging account
resource "aws_vpc" "staging" {
  provider   = aws.staging
  cidr_block = "10.2.0.0/16"
  tags = { Name = "staging-vpc" }
}
```

## Passing Provider to Modules

```hcl
module "production_baseline" {
  source = "./modules/account-baseline"

  providers = {
    aws = aws.production
  }

  account_name = "production"
  vpc_cidr     = "10.1.0.0/16"
}

module "staging_baseline" {
  source = "./modules/account-baseline"

  providers = {
    aws = aws.staging
  }

  account_name = "staging"
  vpc_cidr     = "10.2.0.0/16"
}
```

```hcl
# modules/account-baseline/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags       = { Name = "${var.account_name}-vpc" }
}
```

## Cross-Account Resource References

Reference resources across accounts:

```hcl
# Create a VPC peering connection between production and staging
resource "aws_vpc_peering_connection" "prod_to_staging" {
  provider    = aws.production
  vpc_id      = aws_vpc.production.id
  peer_vpc_id = aws_vpc.staging.id
  peer_owner_id = var.staging_account_id
  peer_region = "us-east-1"
  auto_accept = false
}

resource "aws_vpc_peering_connection_accepter" "staging_accept" {
  provider                  = aws.staging
  vpc_peering_connection_id = aws_vpc_peering_connection.prod_to_staging.id
  auto_accept               = true
}
```

## Dynamic Multi-Account Provider Generation

For configurations targeting many accounts, use a shared account map with `for_each` on modules or aliased provider configurations:

```hcl
locals {
  account_configs = {
    "prod-us"  = { account_id = "111111111111", region = "us-east-1" }
    "prod-eu"  = { account_id = "222222222222", region = "eu-west-1" }
    "staging"  = { account_id = "333333333333", region = "us-east-1" }
  }
}
```

Note: OpenTofu supports `for_each` on aliased provider configurations. You still need to select individual provider instances explicitly when using them in resources or passing them to modules, and Terragrunt or separate workspace-per-account patterns can still help when orchestrating very large account fleets.

## Conclusion

Provider aliases with `assume_role` are the standard approach for multi-account OpenTofu deployments. Define one provider per account, pass providers to modules explicitly, and reference cross-account resources by using the appropriate provider in each resource. For large numbers of accounts, consider adopting Terragrunt for automated multi-account configurations.
