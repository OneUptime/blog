# How to Use Provider for_each Introduced in OpenTofu 1.9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider for_each, OpenTofu 1.9, Multi-Region, Infrastructure as Code

Description: Learn how to use provider for_each introduced in OpenTofu 1.9 to dynamically create multiple provider instances from a map or set.

## Introduction

OpenTofu 1.9 introduced `for_each` on aliased provider blocks, allowing you to create multiple provider instances dynamically. Previously, managing resources across many AWS regions or accounts required manually duplicating provider blocks. With provider `for_each`, you can drive provider instantiation from a variable or local and reference each instance as `aws.<alias>[<key>]`.

## Basic Provider for_each

Create multiple AWS provider instances from a set of regions.

```hcl
# variables.tf

variable "regions" {
  type    = set(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

variable "disabled_regions" {
  type    = set(string)
  default = []
}

locals {
  deploy_regions = setsubtract(var.regions, var.disabled_regions)
}

# providers.tf
provider "aws" {
  alias    = "by_region"
  for_each = var.regions
  region   = each.value
}
```

## Using Dynamic Providers in Resources

Reference a specific provider instance using `provider = aws.by_region[each.key]`. Use a separate collection for the resources so provider instances remain available long enough to destroy removed resources cleanly.

```hcl
resource "aws_s3_bucket" "regional" {
  for_each = local.deploy_regions
  provider = aws.by_region[each.key]

  bucket = "my-app-${each.key}-backup"

  tags = {
    Region = each.key
  }
}
```

## Multi-Account Setup

Drive provider instances from a map of account configurations.

```hcl
variable "aws_accounts" {
  type = map(object({
    account_id = string
    role_arn   = string
    region     = string
  }))
  default = {
    prod = {
      account_id = "111111111111"
      role_arn   = "arn:aws:iam::111111111111:role/OpenTofuRole"
      region     = "us-east-1"
    }
    staging = {
      account_id = "222222222222"
      role_arn   = "arn:aws:iam::222222222222:role/OpenTofuRole"
      region     = "us-east-1"
    }
    dev = {
      account_id = "333333333333"
      role_arn   = "arn:aws:iam::333333333333:role/OpenTofuRole"
      region     = "us-west-2"
    }
  }
}

variable "disabled_accounts" {
  type    = set(string)
  default = []
}

locals {
  deploy_accounts = {
    for account, config in var.aws_accounts : account => config
    if !contains(var.disabled_accounts, account)
  }
}

provider "aws" {
  alias    = "by_account"
  for_each = var.aws_accounts
  region   = each.value.region

  assume_role {
    role_arn = each.value.role_arn
  }
}
```

## Deploying Resources Across All Accounts

Create an S3 bucket in every active account from a single resource block.

```hcl
resource "aws_s3_bucket" "audit_logs" {
  for_each = local.deploy_accounts
  provider = aws.by_account[each.key]

  bucket = "audit-logs-${each.value.account_id}"

  tags = {
    Account     = each.key
    AccountId   = each.value.account_id
    ManagedBy   = "opentofu"
  }
}
```

## Passing Dynamic Providers to Modules

Pass a provider instance to a module using provider aliases.

```hcl
module "networking" {
  for_each = local.deploy_regions
  source   = "./modules/networking"

  providers = {
    aws = aws.by_region[each.key]
  }

  region      = each.key
  vpc_cidr    = "10.${index(sort(tolist(var.regions)), each.key)}.0.0/16"
}
```

## Conditional Provider Instances

Use an expression to conditionally include regions.

```hcl
locals {
  selected_regions = var.multi_region_enabled ? var.regions : toset(["us-east-1"])
}

provider "aws" {
  alias    = "by_region"
  for_each = local.selected_regions
  region   = each.value
}
```

## Running Plans with Dynamic Providers

```bash
# Init installs the provider and prepares the working directory
tofu init

# Plan shows resources for all active provider instances
tofu plan

# Target a specific resource instance in exceptional situations
tofu plan -target='aws_s3_bucket.regional["us-east-1"]'
```

## Summary

Provider `for_each` in OpenTofu 1.9 eliminates the need to manually duplicate provider blocks for multi-region and multi-account configurations. By driving aliased provider configurations from variables or locals, and by keeping provider iteration broader than the resources or modules it manages, you can add or remove regions and accounts without repeating configuration blocks.
