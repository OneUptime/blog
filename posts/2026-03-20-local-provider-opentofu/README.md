# How to Configure the Local Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Local Provider, Infrastructure as Code, IaC, File Management

Description: Learn how to configure the Local provider in OpenTofu to manage local files, directories, and scripts.

## Introduction

This guide covers How to Configure the Local Provider in OpenTofu using OpenTofu with practical examples and production-ready configurations.

The Local provider manages files on the machine where OpenTofu runs. Unlike API-backed providers, it does not require service credentials or remote authentication. It is commonly used to generate configuration files, write sensitive environment files, and create executable scripts as part of an infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+
- Basic understanding of OpenTofu concepts
- A writable directory on the machine running OpenTofu

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.8"
    }
  }
}

provider "local" {}
```

## Step 2: Set Up File Paths and Variables

```hcl
variable "environment" {
  description = "Environment name written into generated files"
  type        = string
  default     = "dev"
}

variable "api_token" {
  description = "Example token written to a sensitive local file"
  type        = string
  sensitive   = true
  default     = "replace-me"
}

locals {
  output_dir = "${path.module}/generated"
}
```

## Step 3: Create Basic Resources

```hcl
resource "local_file" "config" {
  filename             = "${local.output_dir}/app.conf"
  content              = <<-EOT
    app_name = "example"
    environment = "${var.environment}"
    log_level = "info"
  EOT
  file_permission      = "0644"
  directory_permission = "0755"
}

resource "local_file" "script" {
  filename        = "${local.output_dir}/setup.sh"
  content         = <<-EOT
    #!/usr/bin/env bash
    set -euo pipefail

    echo "Preparing ${var.environment} environment"
  EOT
  file_permission = "0755"
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "local_sensitive_file" "env" {
  filename             = "${local.output_dir}/app.env"
  content              = <<-EOT
    APP_ENV=${var.environment}
    API_TOKEN=${var.api_token}
  EOT
  file_permission      = "0600"
  directory_permission = "0700"
}
```

## Step 5: Define Outputs

```hcl
output "config_path" {
  description = "Path to the generated configuration file"
  value       = local_file.config.filename
}

output "script_path" {
  description = "Path to the generated setup script"
  value       = local_file.script.filename
}

output "config_sha256" {
  description = "SHA256 checksum of the generated configuration file"
  value       = local_file.config.content_sha256
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

### Files Recreated on Another Machine
The Local provider works with the filesystem on the machine where OpenTofu runs. If you apply the same configuration on another machine where the files are not present, OpenTofu can detect those resources as deleted and plan to recreate them.

### Sensitive Content Handling
Avoid the deprecated `sensitive_content` argument on `local_file`. Use `local_sensitive_file` for secrets and set `file_permission` and `directory_permission` explicitly when writing sensitive files.

### File Read Errors
If you use the `local_file` data source, the file must already exist on disk or the read will fail.

## Conclusion

You have successfully configured How to Configure the Local Provider in OpenTofu using OpenTofu. This provider is useful for generating configuration files, executable scripts, and sensitive local artifacts as code. Because it depends on the local filesystem, use it carefully in workflows that run across multiple machines.
