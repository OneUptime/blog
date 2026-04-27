# How to Generate Random IDs for Resource Naming with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Random, Resource Naming, Random_id, Random_string

Description: Learn how to use OpenTofu's random_id and random_string resources to generate unique, stable identifiers for cloud resources that require globally unique names.

## Overview

Cloud resources like S3 buckets, Azure storage accounts, and GCP Cloud Storage buckets require globally unique names. OpenTofu's `random_id` and `random_string` resources generate stable unique suffixes that persist across applies.

## Step 1: random_id for Hex Suffixes

```hcl
# main.tf - random_id for hex suffixes

resource "random_id" "bucket_suffix" {
  byte_length = 8  # 8 bytes = 16 hex chars
}

# S3 bucket with unique name
resource "aws_s3_bucket" "app" {
  bucket = "app-data-${random_id.bucket_suffix.hex}"
  # Result: app-data-3f2a9c1b4e5d8a2f
}

# Base64 URL-safe encoding (shorter)
resource "aws_s3_bucket" "assets" {
  bucket = "app-assets-${random_id.bucket_suffix.b64_url}"
  # Result: app-assets-PyrJw02K3eY (shorter than hex)
}
```

## Step 2: random_string for Alphanumeric Names

```hcl
# random_string for naming constraints
resource "random_string" "storage_suffix" {
  length  = 8
  special = false
  upper   = false  # Azure storage names must be lowercase
  numeric = true
}

# Azure storage account (lowercase alphanumeric, max 24 chars)
resource "azurerm_storage_account" "app" {
  name                     = "appdata${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Step 3: Keepers for Controlled Regeneration

```hcl
# random_id with keepers - only changes when keeper changes
resource "random_id" "deployment" {
  byte_length = 4

  # Changing this triggers a new random_id
  keepers = {
    deployment_date = "2026-03"  # Change monthly for rolling updates
  }
}

# Resource prefix for the current deployment
locals {
  deployment_prefix = "app-${random_id.deployment.hex}"
}

resource "aws_instance" "app" {
  count = 3

  tags = {
    Name          = "${local.deployment_prefix}-${count.index}"
    DeploymentId  = random_id.deployment.hex
  }
}
```

## Step 4: Multiple Unique Names

```hcl
# Generate unique names for multiple resources
locals {
  environments = ["dev", "staging", "prod"]
}

resource "random_id" "env_suffix" {
  for_each = toset(local.environments)

  byte_length = 4

  keepers = {
    environment = each.key
  }
}

resource "aws_s3_bucket" "env_bucket" {
  for_each = toset(local.environments)

  bucket = "${each.key}-data-${random_id.env_suffix[each.key].hex}"
}

# Output the generated names
output "bucket_names" {
  value = {
    for env, bucket in aws_s3_bucket.env_bucket :
    env => bucket.bucket
  }
}
```

## Summary

OpenTofu's `random_id` generates stable hex/base64 identifiers that persist in state until the `keepers` map changes. Using `keepers = { environment = each.key }` with `for_each` ensures each environment gets its own stable suffix that doesn't change on subsequent applies. The `byte_length` controls entropy: 4 bytes gives 8 hex chars (4 billion combinations), sufficient for uniqueness within an organization while keeping names reasonably short.
