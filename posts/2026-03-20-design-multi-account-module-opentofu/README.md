# How to Design a Multi-Account Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS Organizations, Multi-Account, Module, IAM

Description: Learn how to design a multi-account module for OpenTofu that manages AWS Organizations accounts, cross-account roles, and account-level configurations through a centralized structure.

## Introduction

Managing multiple AWS accounts through OpenTofu requires a module that can provision resources in different accounts using assumed roles. A multi-account module centralizes account management while enabling per-account configuration.

## Provider Configuration for Multi-Account

```hcl
# Root configuration: define a provider instance per account

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

variable "accounts" {
  type = map(object({
    account_id  = string
    environment = string
    role_name   = string
    region      = string
  }))
}

# Use a management-account provider for organization-level resources
provider "aws" {
  alias  = "management"
  region = "us-east-1"
}

# Create one provider instance per account using assume_role.
# Provider configurations stay in the root module and are passed
# into child modules with the providers meta-argument.
provider "aws" {
  alias    = "accounts"
  for_each = var.accounts

  region = each.value.region

  assume_role {
    role_arn = "arn:aws:iam::${each.value.account_id}:role/${each.value.role_name}"
  }
}
```

## Multi-Account Module Structure

```hcl
# modules/account-baseline/main.tf
# Applied to each AWS account to establish baseline configuration.
# Reusable child modules declare provider requirements but no provider blocks.

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

variable "account_id"   { type = string }
variable "account_name" { type = string }
variable "environment"  { type = string }

variable "guardduty_enabled" {
  type    = bool
  default = false
}

variable "security_hub_enabled" {
  type    = bool
  default = false
}

variable "cloudtrail_bucket"        { type = string }

variable "iam_password_policy" {
  type = object({
    minimum_length         = number
    require_lowercase      = bool
    require_symbols        = bool
    require_numbers        = bool
    require_uppercase      = bool
    max_password_age       = number
    password_reuse_prevent = number
  })
  default = {
    minimum_length         = 14
    require_lowercase      = true
    require_symbols        = true
    require_numbers        = true
    require_uppercase      = true
    max_password_age       = 90
    password_reuse_prevent = 24
  }
}

variable "cross_account_roles" {
  description = "Cross-account IAM roles to create for centralized access"
  type = map(object({
    trust_account_id = string
    managed_policies = list(string)
    description      = string
  }))
  default = {}
}
```

```hcl
# Apply IAM password policy
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = var.iam_password_policy.minimum_length
  require_lowercase_characters   = var.iam_password_policy.require_lowercase
  require_symbols                = var.iam_password_policy.require_symbols
  require_numbers                = var.iam_password_policy.require_numbers
  require_uppercase_characters   = var.iam_password_policy.require_uppercase
  max_password_age               = var.iam_password_policy.max_password_age
  password_reuse_prevention      = var.iam_password_policy.password_reuse_prevent
  allow_users_to_change_password = true
}

# EBS default encryption for the provider's configured region
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}

# S3 account-level public access block
resource "aws_s3_account_public_access_block" "main" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Cross-account IAM roles
resource "aws_iam_role" "cross_account" {
  for_each    = var.cross_account_roles
  name        = each.key
  description = each.value.description

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${each.value.trust_account_id}:root" }
      Action    = "sts:AssumeRole"
      Condition = {
        Bool = { "aws:MultiFactorAuthPresent" = "true" }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cross_account" {
  for_each = {
    for item in flatten([
      for role_name, role in var.cross_account_roles : [
        for policy_arn in role.managed_policies : {
          key        = "${role_name}-${basename(policy_arn)}"
          role_name  = role_name
          policy_arn = policy_arn
        }
      ]
    ]) : item.key => item
  }

  role       = aws_iam_role.cross_account[each.value.role_name].name
  policy_arn = each.value.policy_arn
}

# Enable a GuardDuty detector in this account and region when requested
resource "aws_guardduty_detector" "main" {
  count  = var.guardduty_enabled ? 1 : 0
  enable = true
}
```

## Root Module: Apply to Multiple Accounts

```hcl
# Apply baseline to each account using for_each over account configs
module "account_baseline" {
  for_each = var.accounts
  source   = "./modules/account-baseline"

  providers = {
    aws = aws.accounts[each.key]
  }

  account_id   = each.value.account_id
  account_name = each.key
  environment  = each.value.environment
  cloudtrail_bucket = var.centralized_cloudtrail_bucket
}
```

## Conclusion

Multi-account modules enable centralized governance across an AWS Organization. By applying the same baseline module to every account, you ensure consistent security controls: password policies and public access blocks are standardized, while region-scoped settings such as default EBS encryption and GuardDuty detectors can be applied consistently in the configured region. Cross-account roles managed through variables make it easy to grant centralized teams access to member accounts.
