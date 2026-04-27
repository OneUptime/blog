# How to Use Provider for_each for Dynamic Provider Instances in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Provider

Description: Learn how to use provider for_each in OpenTofu to dynamically create multiple provider instances from a map without writing a separate provider block for each.

## Introduction

OpenTofu supports `for_each` on provider blocks, allowing you to create multiple provider instances from a map. This eliminates the need to write one provider block per account, region, or workspace - instead, you define the provider once and let `for_each` generate all instances.

## Syntax

```hcl
provider "PROVIDER" {
  alias    = "STATIC_NAME"
  for_each = MAP

  # Use each.key and each.value to configure each instance
}
```

The `alias` is a fixed string that names the multi-instance provider configuration as a group. Individual instances are selected later using bracket notation with the `for_each` key, for example `PROVIDER.STATIC_NAME[each.key]`.

## Multi-Region AWS Example

```hcl
variable "aws_regions" {
  type = map(object({
    cidr = string
  }))
  default = {
    us-east-1 = { cidr = "10.0.0.0/16" }
    eu-west-1 = { cidr = "10.1.0.0/16" }
    ap-east-1 = { cidr = "10.2.0.0/16" }
  }
}

provider "aws" {
  alias    = "by_region"
  for_each = var.aws_regions
  region   = each.key
}
```

## Using Dynamic Providers with Modules

Pass dynamically created providers to module instances using `for_each`:

```hcl
module "regional_vpc" {
  for_each = { for region, config in var.aws_regions : region => config }

  source = "./modules/vpc"
  providers = {
    aws = aws.by_region[each.key]  # Reference the dynamic provider instance
  }

  name = "vpc-${each.key}"
  cidr = each.value.cidr
}
```

Note that the module's `for_each` expression is written differently from the provider's `for_each` expression. OpenTofu requires these two expressions to differ (even if they evaluate to the same map) so that provider instances outlive the resources that use them during destroy operations.

## Multi-Account Deployment

```hcl
variable "aws_accounts" {
  type = map(object({
    role_arn = string
    region   = string
  }))
  default = {
    production = {
      role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
      region   = "us-east-1"
    }
    staging = {
      role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
      region   = "us-east-1"
    }
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

module "account_baseline" {
  for_each = { for name, config in var.aws_accounts : name => config }

  source = "./modules/account-baseline"
  providers = {
    aws = aws.by_account[each.key]
  }

  account_name = each.key
}
```

## Provider for_each with Kubernetes

```hcl
variable "eks_clusters" {
  type = map(object({
    endpoint               = string
    cluster_ca_certificate = string
    token                  = string
  }))
}

provider "kubernetes" {
  alias    = "by_cluster"
  for_each = var.eks_clusters

  host                   = each.value.endpoint
  cluster_ca_certificate = base64decode(each.value.cluster_ca_certificate)
  token                  = each.value.token
}
```

## Important Notes

- Provider `for_each` was introduced in OpenTofu 1.9 and is not available in stock Terraform.
- The `alias` must be a static string. It names the multi-instance provider configuration; individual instances are distinguished by the `for_each` key.
- The value passed to `for_each` must be a map, an object, or a set of strings, and it must be known at plan time.
- Reference dynamic providers using `<PROVIDER>.<ALIAS>[<KEY>]`, for example `aws.by_region[each.key]`.
- The `for_each` expression on a resource or module must not be the exact same expression as the `for_each` on its provider, so that provider instances outlive their associated resources during destroy.

## Conclusion

Provider `for_each` eliminates repetitive provider block declarations for multi-region and multi-account configurations. Define the provider topology as a map variable and let OpenTofu generate all instances dynamically. Combined with module `for_each`, this pattern scales cleanly to dozens of regions or accounts without any code duplication.
