# How to Configure the External Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, External Provider, Infrastructure as Code, IaC, Custom Data Sources

Description: Learn how to configure the External provider in OpenTofu to integrate with custom scripts and external data sources.

## Introduction

This guide covers how to configure the External provider in OpenTofu with practical examples and a script-driven data source.

## Prerequisites

- OpenTofu v1.6+
- A script or program that can read JSON from `stdin` and return JSON on `stdout`
- `jq` if you use the shell example below
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}

# The external provider does not require any provider-specific
# configuration, so a provider block can be omitted.
```

## Step 2: Set Up Authentication

```bash
# If your external program calls an authenticated API,
# export credentials so the child process can read them.
export SERVICE_API_TOKEN="your-api-token"
```

```bash
# scripts/project-info.sh
#!/usr/bin/env bash
set -euo pipefail

eval "$(jq -r '@sh "ENVIRONMENT=\(.environment) SERVICE=\(.service)"')"

# If the script needs to call an external API, it can read
# SERVICE_API_TOKEN from the environment passed through by OpenTofu.

jq -n \
  --arg project_name "${ENVIRONMENT}-${SERVICE}" \
  --arg source "external-provider" \
  '{"project_name":$project_name,"source":$source}'
```

## Step 3: Create a Basic Data Source

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "service_name" {
  description = "Service name passed to the external program"
  type        = string
}

data "external" "project_info" {
  program = ["bash", "${path.module}/scripts/project-info.sh"]

  query = {
    environment = var.environment
    service     = var.service_name
  }
}
```

## Step 4: Configure Advanced Settings

```hcl
data "external" "project_info" {
  program     = ["bash", "${path.module}/scripts/project-info.sh"]
  working_dir = path.module

  query = {
    environment = var.environment
    service     = var.service_name
  }
}

locals {
  project_metadata = {
    project_name = data.external.project_info.result.project_name
    source       = data.external.project_info.result.source
  }
}
```

## Step 5: Define Outputs

```hcl
output "project_name" {
  description = "The project name returned by the external program"
  value       = data.external.project_info.result.project_name
}

output "project_source" {
  description = "The source returned by the external program"
  value       = data.external.project_info.result.source
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

### Authentication Errors
If your script calls an external API, verify that the required environment variables are set before running `tofu plan` or `tofu apply`.

### Invalid JSON Output
The external program must read a JSON object from `stdin` and write a JSON object to `stdout`. Both `query` inputs and `result` values must be strings.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the External provider in OpenTofu to run a local program and consume its output as data. Use it when you need read-only data from a script or external system, and prefer a dedicated provider when one exists. Always use environment variables or secure secret stores for sensitive credentials used by your external program.
