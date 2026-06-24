# How to Configure Archive Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Archive provider in OpenTofu to manage Archive resources as code.

## Introduction

The Archive provider for OpenTofu works with local files and can create `zip` and `tar.gz` archives as part of your OpenTofu workflow. This guide covers provider installation, the `archive_file` resource, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The `archive` provider requires no credentials and no special authentication:

```bash
# No environment variables are required for the archive provider.
```

```hcl
provider "archive" {}
```

## Example Resource

```hcl
resource "archive_file" "main" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = var.output_path
}
```

## Variables

```hcl
variable "source_dir"  { type = string }
variable "output_path" { type = string }
```

## Outputs

```hcl
output "archive_path" {
  value = archive_file.main.output_path
}

output "archive_checksum" {
  value = archive_file.main.output_base64sha256
}
```

## Best Practices

- Use the `archive_file` resource when the archive must persist from plan to apply; the `archive_file` data source builds the archive during plan
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Set `output_file_mode` when you need deterministic archive permissions and checksums across platforms
- Use `excludes` to keep unwanted files and directories out of the archive

## Conclusion

Using the Archive provider in OpenTofu lets you create local archive artifacts alongside the rest of your configuration. Start with a simple `archive_file` resource, and use the data source only when plan-time archive generation fits your workflow.
