# How to Configure the Archive Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Archive Provider, Infrastructure as Code, IaC, File Packaging

Description: Learn how to configure the Archive provider in OpenTofu to create ZIP archives for Lambda functions and other deployments.

## Introduction

This guide covers how to configure the Archive provider in OpenTofu to create ZIP archives from local files and directories for Lambda functions and other deployments.

## Prerequisites

- OpenTofu v1.6+
- Files or a directory you want to package
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}
```

The Archive provider requires no provider block or API credentials.

## Step 2: Define Archive Inputs

```hcl
locals {
  archive_type = "zip"
  source_dir   = "${path.module}/lambda"
  output_path  = "${path.module}/lambda.zip"
}
```

## Step 3: Create a Basic Archive

```hcl
resource "archive_file" "lambda" {
  type        = local.archive_type
  source_dir  = local.source_dir
  output_path = local.output_path
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "archive_file" "lambda_advanced" {
  type                        = "zip"
  source_dir                  = "${path.module}/lambda"
  output_path                 = "${path.module}/lambda-advanced.zip"
  excludes                    = ["**/.terraform/**", "**/*.tmp"]
  output_file_mode            = "0666"
  exclude_symlink_directories = true
}
```

## Step 5: Define Outputs

```hcl
output "archive_path" {
  description = "The path to the generated archive"
  value       = archive_file.lambda.output_path
}

output "archive_sha256" {
  description = "Base64-encoded SHA256 checksum of the archive"
  value       = archive_file.lambda.output_base64sha256
}

output "archive_size" {
  description = "The size of the generated archive in bytes"
  value       = archive_file.lambda.output_size
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### No Authentication Required
The Archive provider works with local files and does not use API credentials. If initialization fails, verify the provider source address and version constraint instead.

### Empty Archive Errors
Archive provider v2.4.2 and later returns an error when the resulting archive would be empty. Make sure the source directory contains files and that your `excludes` patterns are not filtering everything out.

### Plan and Apply Behavior
If you use `data "archive_file"` instead of `resource "archive_file"`, the archive is created during `tofu plan`. Persist that generated file between `plan` and `apply`, or use the resource form for multi-step CI/CD workflows.

## Conclusion

You have successfully configured the Archive provider in OpenTofu to generate ZIP archives from local files and directories. Because the provider requires no credentials, the main choices are which source input to package and whether to use the data source or resource form for your workflow. Use the archive outputs, especially checksums, to feed downstream deployments such as Lambda.
