# How to Use for_each with Import Blocks in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Import

Description: Learn how to use for_each with import blocks in OpenTofu to import multiple resources simultaneously with a single block.

## Introduction

Import blocks support `for_each`, allowing you to import many resources at once with a single block. This is particularly useful when importing resources that will be managed by a `for_each` resource configuration, such as multiple S3 buckets, IAM roles, or VPCs that follow a naming pattern.

## Basic for_each Import

```hcl
# Import multiple S3 buckets in one block

import {
  for_each = toset(["data", "logs", "backups"])
  to = aws_s3_bucket.buckets[each.value]
  id = "acme-${each.value}-bucket"
}

resource "aws_s3_bucket" "buckets" {
  for_each = toset(["data", "logs", "backups"])
  bucket   = "acme-${each.value}-bucket"
}
```

## Import from a Map

```hcl
# Map of environment → bucket name
locals {
  buckets = {
    production = "acme-data-prod-1234567890"
    staging    = "acme-data-staging-1234567890"
    development = "acme-data-dev-1234567890"
  }
}

import {
  for_each = local.buckets
  to       = aws_s3_bucket.env_buckets[each.key]
  id       = each.value  # Actual bucket name
}

resource "aws_s3_bucket" "env_buckets" {
  for_each = local.buckets
  bucket   = each.value
}
```

## Import IAM Roles in Bulk

```hcl
locals {
  roles = {
    "app-server"   = "AcmeAppServerRole"
    "data-processor" = "AcmeDataProcessorRole"
    "api-gateway"  = "AcmeApiGatewayRole"
  }
}

import {
  for_each = local.roles
  to       = aws_iam_role.service_roles[each.key]
  id       = each.value  # IAM role name is the import ID
}

resource "aws_iam_role" "service_roles" {
  for_each = local.roles
  name     = each.value
  # ...
}
```

## Import Subnets Across AZs

```hcl
locals {
  subnet_ids = {
    "us-east-1a" = "subnet-0abc111"
    "us-east-1b" = "subnet-0abc222"
    "us-east-1c" = "subnet-0abc333"
  }
}

import {
  for_each = local.subnet_ids
  to       = aws_subnet.public[each.key]
  id       = each.value  # Subnet ID is the import ID
}

resource "aws_subnet" "public" {
  for_each          = local.subnet_ids
  availability_zone = each.key
  # Configure remaining attributes to match actual subnets
}
```

## Plan Shows All Imports

```bash
tofu plan

# Output:
# # aws_s3_bucket.buckets["data"] will be imported
# # aws_s3_bucket.buckets["logs"] will be imported
# # aws_s3_bucket.buckets["backups"] will be imported
#
# Plan: 3 to import, 0 to add, 0 to change, 0 to destroy.
```

## After Import: Clean Up

```bash
tofu apply

# Remove the import block after successful import
# (the for_each resource configuration stays)
tofu plan
# Should show no changes
```

## Using Data Sources to Drive Import IDs

```hcl
# Discover existing resources dynamically
data "aws_iam_roles" "existing" {}

# Import all discovered roles that match a pattern
locals {
  target_roles = {
    for name in data.aws_iam_roles.existing.names :
    name => name if startswith(name, "Acme")
  }
}

import {
  for_each = local.target_roles
  to       = aws_iam_role.managed[each.key]
  id       = each.value
}
```

## Error Handling: Mismatched Keys

The `to` address key must match the `for_each` key in the resource configuration:

```hcl
# import block for_each key
import {
  for_each = { "prod" = "production-bucket" }
  to = aws_s3_bucket.buckets["prod"]  # Key must match resource's for_each key
  id = each.value
}

# Resource must use the same keys
resource "aws_s3_bucket" "buckets" {
  for_each = { "prod" = "production-bucket" }
  bucket   = each.value
}
```

## Conclusion

`for_each` on import blocks is the efficient way to import many related resources at once. Use a map to associate configuration keys with import IDs, match the `for_each` expression in the import block with the `for_each` in the resource block, and use `each.value` for the import ID. After applying, remove the import block while keeping the resource configuration.
