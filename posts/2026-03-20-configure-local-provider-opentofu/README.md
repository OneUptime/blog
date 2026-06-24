# How to Configure Local Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Local provider in OpenTofu to manage Local resources as code.

## Introduction

The Local provider for OpenTofu enables managing files on the local filesystem with the same plan/apply workflow as your cloud infrastructure. This guide covers provider installation, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.8"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Local provider operates entirely on the local filesystem of the machine running OpenTofu, so it requires no API keys, tokens, or credentials. The provider block can be omitted or left empty:

```hcl
provider "local" {
  # No configuration required
}
```

File access is governed by the OS-level permissions of the user running `tofu apply`.

## Example Resource

```hcl
# Generate a configuration file on the local filesystem
resource "local_file" "main" {
  filename        = "${path.module}/${var.name}-${var.environment}.conf"
  content         = "environment=${var.environment}\nmanaged_by=opentofu\n"
  file_permission = "0644"
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = local_file.main.id }
```

## Best Practices

- Use `local_sensitive_file` (not `local_file`) when writing secrets so the content is omitted from plan output and state diffs
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Set explicit `file_permission` and `directory_permission` values rather than relying on the default `0777`

## Conclusion

Managing local files with OpenTofu brings the same consistency and auditability to filesystem artifacts as you get with cloud infrastructure. Start by codifying your most critical generated configuration files and gradually expand coverage over time.
