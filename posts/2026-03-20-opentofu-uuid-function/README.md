# How to Use the uuid Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the uuid function in OpenTofu to generate random UUID v4 identifiers for unique resource naming and tracking.

## Introduction

The `uuid` function in OpenTofu generates a random UUID (Universally Unique Identifier) version 4. Each call returns a different value, making it useful for generating unique identifiers for resources, correlating deployments, and creating unique names.

**Important:** Like `timestamp()`, `uuid()` produces a different value on every evaluation. This means resources using it will show a diff on every plan. Use `random_uuid` resource for stable UUIDs.

## Syntax

```hcl
uuid()
```

- Returns a randomly generated UUID v4 string (e.g., `"6b9f4b38-c65a-4b1d-a86e-..."`)
- Generates a new UUID each time it is evaluated

## Basic Examples

```hcl
output "random_uuid" {
  value = uuid()
  # Returns something like "6b9f4b38-c65a-4b1d-a86e-4e1b2a3c4d5e"
}
```

## Practical Use Cases

### Null Resource Trigger for Always-Run

```hcl
resource "null_resource" "always_run" {
  triggers = {
    # uuid() changes every run → triggers re-execution every time
    run_id = uuid()
  }

  provisioner "local-exec" {
    command = "echo 'Deployment run ID: ${self.triggers.run_id}'"
  }
}
```

### Correlation ID for Deployments

```hcl
locals {
  deployment_id = uuid()
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  tags = {
    Name         = "app-server"
    DeploymentId = local.deployment_id
  }

  lifecycle {
    ignore_changes = [tags["DeploymentId"]]
  }
}
```

## Using random_uuid for Stable UUIDs

For a UUID that doesn't change on every plan, use the `random_uuid` resource:

```hcl
resource "random_uuid" "deployment" {}

output "stable_uuid" {
  value = random_uuid.deployment.result
  # Same value on every plan after first apply
}

resource "aws_s3_bucket" "unique" {
  bucket = "app-${random_uuid.deployment.result}"
}
```

## Step-by-Step Usage

```bash
tofu console

> uuid()
"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
> uuid() != uuid()  # Always different
true
```

## When to Use uuid() vs random_uuid

| | `uuid()` | `random_uuid` resource |
|-|----------|----------------------|
| Stability | Changes every evaluation | Stable after first apply |
| Use case | Always-run triggers | Permanent unique IDs |
| State stored | No | Yes |

## Conclusion

The `uuid` function generates random UUID v4 strings in OpenTofu. Its non-deterministic nature makes it best suited for always-run null resource triggers. For stable, persistent unique identifiers, use the `random_uuid` resource from the random provider instead.
