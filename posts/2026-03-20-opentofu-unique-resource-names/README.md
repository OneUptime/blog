# How to Create Unique Resource Names with Random Suffixes in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Naming, Random, Resource Names, Convention

Description: Learn how to create consistent, unique resource names in OpenTofu using random suffixes, naming conventions, and the format function for provider-specific constraints.

## Overview

Resource naming in OpenTofu must balance uniqueness requirements (globally unique S3 buckets), length limits (Azure storage: 24 chars), and organizational conventions (prefix-environment-component-suffix). This post covers patterns for all scenarios.

## Step 1: Naming Convention Module

```hcl
# modules/naming/main.tf - Centralized naming convention

variable "project"     { type = string }
variable "environment" { type = string }
variable "component"   { type = string }
variable "suffix" {
  type    = string
  default = ""
}

locals {
  # Max safe length for most resources
  base_name = lower("${var.project}-${var.environment}-${var.component}")

  # With suffix
  full_name = var.suffix != "" ? "${local.base_name}-${var.suffix}" : local.base_name

  # Azure storage requires lowercase alphanumeric, max 24 chars
  storage_name = lower(replace(substr(
    "${var.project}${var.environment}${var.component}${var.suffix}",
    0, 24
  ), "-", ""))
}

output "name"         { value = local.full_name }
output "storage_name" { value = local.storage_name }
```

## Step 2: Random Suffix for Global Uniqueness

```hcl
# main.tf - Resource names with guaranteed uniqueness
resource "random_id" "suffix" {
  byte_length = 4  # 8 hex chars

  keepers = {
    project     = var.project
    environment = var.environment
  }
}

locals {
  suffix = random_id.suffix.hex

  names = {
    bucket          = "${var.project}-${var.environment}-assets-${local.suffix}"
    storage_account = lower("${var.project}${var.environment}${local.suffix}")
    key_vault       = "${var.project}-${var.environment}-kv-${local.suffix}"
    function_app    = "${var.project}-${var.environment}-func-${local.suffix}"
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-${var.environment}-assets-${local.suffix}"
}

resource "azurerm_storage_account" "sa" {
  name = lower(substr(
    "${var.project}${var.environment}${local.suffix}",
    0, 24  # Azure storage max length
  ))
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Step 3: Format Function for Name Construction

```hcl
# Use format() for complex name patterns
locals {
  # Pad number to fixed width for consistent ordering
  instances = [for i in range(10) : format("%s-%02d", "web-server", i + 1)]
  # Result: ["web-server-01", "web-server-02", ..., "web-server-10"]

  # Environment abbreviations for length-limited names
  env_abbrev = {
    development = "dev"
    staging     = "stg"
    production  = "prd"
  }

  env_short = lookup(local.env_abbrev, var.environment, var.environment)

  # GCP resource name (lowercase, hyphens only)
  gcp_name = lower(replace("${var.project}-${local.env_short}-${var.component}", "_", "-"))
}
```

## Step 4: Provider-Specific Name Validation

```hcl
# Validate names meet provider requirements using preconditions
resource "azurerm_key_vault" "app" {
  name = local.names.key_vault

  lifecycle {
    precondition {
      condition     = length(local.names.key_vault) >= 3 && length(local.names.key_vault) <= 24
      error_message = "Key Vault name must be 3-24 characters. Got: ${length(local.names.key_vault)}"
    }

    precondition {
      condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$", local.names.key_vault))
      error_message = "Key Vault name must start with a letter and contain only alphanumeric and hyphens."
    }
  }
}
```

## Summary

Unique resource names in OpenTofu combine organizational conventions (project-environment-component) with a stable random suffix from `random_id` to guarantee global uniqueness. Provider-specific constraints (Azure storage: lowercase alphanumeric 24 chars, GCP: lowercase with hyphens) are handled with `lower()`, `replace()`, and `substr()` functions. Lifecycle `precondition` blocks validate names before creating resources, catching naming violations at plan time rather than during apply.
