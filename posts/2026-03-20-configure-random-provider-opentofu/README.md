# How to Configure Random Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Random provider in OpenTofu to manage Random resources as code.

## Introduction

The Random provider for OpenTofu generates random values - strings, integers, passwords, UUIDs, and pet names - that remain stable across plan/apply runs once created. This guide covers installation, the most common resources, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Provider Configuration

The random provider requires no configuration - it has no external service to authenticate with:

```hcl
provider "random" {}
```

## Common Resources

`random_password` generates a random password and stores the result in state (marked sensitive):

```hcl
resource "random_password" "db" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}
```

`random_string` generates a non-sensitive random string, useful for resource name suffixes:

```hcl
resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
  numeric = true
}
```

`random_id` generates a random identifier as a byte array, exposed in hex, base64, and decimal forms:

```hcl
resource "random_id" "bucket_suffix" {
  byte_length = 4
}
```

`random_integer` generates a random integer within a range:

```hcl
resource "random_integer" "port" {
  min = 30000
  max = 32767
}
```

`random_pet` generates a human-friendly random name (e.g. `quiet-koala`):

```hcl
resource "random_pet" "name" {
  length    = 2
  separator = "-"
}
```

`random_uuid` generates a v4 UUID:

```hcl
resource "random_uuid" "id" {}
```

## Keepers: Forcing Regeneration

All random resources accept a `keepers` map. When any value in `keepers` changes, the resource is replaced and a new random value is generated:

```hcl
resource "random_password" "db" {
  length  = 24
  special = true

  keepers = {
    rotation_id = var.password_rotation_id
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
output "bucket_name" {
  value = "${var.name}-${var.environment}-${random_id.bucket_suffix.hex}"
}

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
```

## Best Practices

- Treat `random_password` results as secrets - they are stored in state in plaintext, so protect your state backend
- Use `keepers` to control when a value should be regenerated, instead of tainting resources manually
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Pin provider versions in `required_providers` to prevent unexpected updates

## Conclusion

The `random` provider's primary use case is producing stable random values that participate in the OpenTofu lifecycle - resource name suffixes, bootstrap passwords, ports, and identifiers. Combine it with `keepers` when you need explicit, plan-visible rotation rather than ad-hoc regeneration.
