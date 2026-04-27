# How to Use uuid() and uuidv5() in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function

Description: Learn how to use the uuid() and uuidv5() functions in OpenTofu to generate unique identifiers for your resources.

OpenTofu provides two UUID generation functions: `uuid()` for random (version 4) UUIDs and `uuidv5()` for deterministic (version 5) UUIDs based on a namespace and name. Understanding when to use each is important for infrastructure code.

## uuid()

Generates a random UUID (version 4) each time it's called:

```hcl
> uuid()
"b5ee72a3-54dd-4f3a-9f1e-8a94a76fb7a6"

> uuid()
"a91b0f73-e23c-48d2-89f5-3d0e8b2a5c4f"  # Different every call!
```

**Important**: `uuid()` generates a new value on every plan/apply. This means:
- It will trigger resource recreation if used in arguments that force replacement
- It's fine for tags and non-identifying attributes

```hcl
# CAUTION: This changes every tofu plan!

resource "aws_instance" "app" {
  tags = {
    UniqueID = uuid()  # Changes every plan - may be OK for tags
  }
}

# BAD: This would recreate the bucket on every apply!
resource "aws_s3_bucket" "data" {
  bucket = "myapp-${uuid()}"  # Never do this for bucket names!
}
```

## Using uuid() for One-Time Values

```hcl
# Use random provider for stable random values instead
resource "random_uuid" "deployment_id" {
  # This is stable across plans (only changes when explicitly replaced)
}

resource "aws_s3_bucket" "data" {
  bucket = "myapp-${random_uuid.deployment_id.result}"
}
```

## uuidv5()

Generates a deterministic UUID (version 5) based on a namespace UUID and a name string. Same inputs always produce the same output:

```hcl
# DNS namespace
> uuidv5("dns", "example.com")
"cfbff0d1-9375-5685-968c-48ce8b15ae17"

# URL namespace  
> uuidv5("url", "https://example.com/path")
"0a3c3c32-4c00-5e0b-8943-2eb8d80ab693"

# OID namespace
> uuidv5("oid", "2.16.840")
"..."

# X500 namespace
> uuidv5("x500", "CN=example")
"..."

# Custom namespace UUID
> uuidv5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "example")
"..."
```

## Deterministic IDs with uuidv5()

```hcl
variable "account_id" {
  type = string
}

variable "project_name" {
  type = string
}

locals {
  # Generate a stable, unique ID based on account and project
  # Will always be the same for the same inputs
  project_uuid = uuidv5("dns", "${var.account_id}.${var.project_name}")
}

resource "aws_s3_bucket" "project" {
  bucket = "project-${local.project_uuid}"
  # Stable: "project-<same-uuid-every-time>"
}
```

## Namespacing Resources Across Environments

```hcl
variable "environment" {
  type    = string
  default = "prod"
}

locals {
  # Create environment-specific namespace
  env_namespace = uuidv5("dns", "${var.environment}.mycompany.internal")
  
  # Create unique IDs within that namespace
  app_id  = uuidv5(local.env_namespace, "application")
  db_id   = uuidv5(local.env_namespace, "database")
  cache_id = uuidv5(local.env_namespace, "cache")
}

output "resource_ids" {
  value = {
    app   = local.app_id
    db    = local.db_id
    cache = local.cache_id
  }
}
```

## When to Use Each

```text
uuid():
  - One-time deployment identifiers (applied once, not replanned)
  - Test resource names that should be unique per run
  - Cases where you WANT a different value each run

uuidv5():
  - Stable IDs that must be the same on every run for the same inputs
  - Generating IDs from existing identifiers (account ID + project name)
  - Cross-system ID correlation (same input = same ID across systems)
  - When you need UUIDs but want determinism
```

## Conclusion

`uuid()` is for when you need a unique-per-run random identifier, while `uuidv5()` is for generating stable, deterministic UUIDs from known inputs. For stable resource naming, prefer `uuidv5()` or the `random_uuid` resource over `uuid()` to avoid unintended resource recreation on every plan.
