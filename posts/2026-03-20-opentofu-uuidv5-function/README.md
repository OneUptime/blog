# How to Use the uuidv5 Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the uuidv5 function in OpenTofu to generate deterministic, reproducible UUIDs from a namespace and name for stable unique identifiers.

## Introduction

The `uuidv5` function in OpenTofu generates a UUID version 5, which is deterministic - the same namespace and name always produce the same UUID. This makes it ideal for creating stable, reproducible unique identifiers for resources that need consistent names across deployments.

## Syntax

```hcl
uuidv5(namespace, name)
```

- **namespace** - a UUID string defining the namespace, or a well-known namespace name
- **name** - a string to hash within the namespace
- Returns a deterministic UUID v5 string

## Predefined Namespaces

OpenTofu provides these well-known namespace constants:
- `"dns"` - for DNS names
- `"url"` - for URLs
- `"oid"` - for OIDs
- `"x500"` - for X.500 names

## Basic Examples

```hcl
output "dns_uuid" {
  value = uuidv5("dns", "example.com")
  # Returns a deterministic UUID based on DNS namespace + "example.com"
  # Same every time
}

output "custom_namespace" {
  value = uuidv5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "my-resource")
  # Custom namespace UUID
}
```

## Practical Use Cases

### Stable Resource Identifier

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "service_name" {
  type    = string
  default = "api-gateway"
}

locals {
  # Generates the same UUID every time for the same service+env combination
  resource_id = uuidv5("dns", "${var.service_name}.${var.environment}.internal")
}

resource "aws_s3_bucket" "service" {
  # Deterministic bucket name based on service identity
  bucket = "svc-${substr(local.resource_id, 0, 8)}"

  tags = {
    ServiceId = local.resource_id
    Service   = var.service_name
    Env       = var.environment
  }
}
```

### Consistent Cross-Account Resource Names

```hcl
variable "account_id" {
  type    = string
  default = "123456789012"
}

variable "resource_type" {
  type    = string
  default = "iam-role"
}

locals {
  # Same account + resource type always gives same UUID
  cross_account_id = uuidv5("dns", "${var.account_id}.${var.resource_type}")
}

output "cross_account_resource_id" {
  value = local.cross_account_id
}
```

### Idempotent External System Registration

```hcl
variable "cluster_name" {
  type    = string
  default = "my-cluster"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

locals {
  # Stable cluster ID - same cluster always gets same UUID
  cluster_uuid = uuidv5("url", "https://${var.cluster_name}.${var.region}.clusters.example.com")
}

resource "aws_ssm_parameter" "cluster_id" {
  name  = "/clusters/${var.cluster_name}/id"
  type  = "String"
  value = local.cluster_uuid
}
```

## Step-by-Step Usage

```bash
tofu console

> uuidv5("dns", "example.com")
"cfbff0d1-9375-5685-968c-48ce8b15ae17"
> uuidv5("dns", "example.com")  # Same result every time
"cfbff0d1-9375-5685-968c-48ce8b15ae17"
```

## uuidv5 vs uuid vs random_uuid

| | `uuid()` | `uuidv5(ns, name)` | `random_uuid` |
|-|----------|-------------------|---------------|
| Deterministic | No | Yes | Yes (in state) |
| Requires state | No | No | Yes |
| Same input → same output | No | Yes | N/A |

## Conclusion

The `uuidv5` function generates deterministic UUIDs in OpenTofu - the same namespace and name always produce the same UUID. This makes it valuable for creating stable identifiers that don't require Terraform state, enabling idempotent resource naming and cross-system correlation without randomness.
