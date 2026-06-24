# How to Configure External Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the External provider in OpenTofu to manage External resources as code.

## Introduction

The `external` provider for OpenTofu allows an external program to participate in your configuration as a data source. This guide covers provider installation, passing input to the external program, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3.5"
    }
  }

  required_version = ">= 1.6.0"
}
```

## Authentication

The `external` provider does not define its own authentication settings. If the program you call needs credentials, pass them to that program securely, typically through environment variables:

```bash
# Optional: credentials consumed by your external program

export EXTERNAL_API_TOKEN="your-api-token"
```

## Example Data Source

```hcl
data "external" "main" {
  program = ["bash", "${path.module}/example-data-source.sh"]

  query = {
    name        = var.name
    environment = var.environment
  }
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "external_result" { value = data.external.main.result }
```

## Best Practices

- If your external program needs credentials, pass them through environment variables or a secrets manager, never hardcode them in scripts or `.tf` files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Prefer a first-class provider when one exists, and keep external programs read-only because `external` exposes data sources rather than managed resources

## Conclusion

Using the `external` provider in OpenTofu lets you bring read-only data from local scripts or programs into the same workflow as the rest of your configuration. Start with simple integrations, and move to a first-class provider when the integration grows beyond a small data-source use case.
