# How to Use the uuid Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, UUID, Unique Identifiers, Resource Naming, Infrastructure as Code

Description: Learn how to use Terraform's uuid function to generate unique identifiers for resources, understand its behavior across plan and apply, and avoid common pitfalls.

---

The `uuid()` function in Terraform generates a random UUID (Universally Unique Identifier) in the standard v4 format. UUIDs are useful when you need guaranteed unique identifiers for resources, configurations, or tracking purposes. But the function has some behaviors that can surprise you if you are not prepared. This post covers how to use it correctly and when to reach for alternatives.

## Basic Usage

The function takes no arguments and returns a new v4 UUID every time it is called:

```hcl
output "random_id" {
  value = uuid()
  # Example: "a3f1b2c4-d5e6-7f89-0a1b-2c3d4e5f6789"
}
```

Each call generates a different UUID. Running `terraform plan` twice produces different values.

## UUID Format

The UUID follows the standard v4 format: 8-4-4-4-12 hexadecimal characters separated by hyphens:

```
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

Where `x` is a random hex digit and `y` is one of 8, 9, a, or b. The `4` indicates it is a version 4 (random) UUID.

```hcl
output "uuid_example" {
  value = uuid()
  # "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  #                ^                         (always 4 - version 4)
  #                     ^                    (always 8, 9, a, or b)
}
```

## The Key Behavior: New Value Every Time

This is the most important thing to understand about `uuid()`: it generates a new value on every evaluation. Every `terraform plan` and every `terraform apply` produces a different UUID. This means:

```hcl
# WARNING: This changes on every plan
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    UniqueId = uuid()  # Different on every plan - triggers an update each time
  }
}
```

If you use `uuid()` directly in a resource attribute, Terraform will show a change on every plan, even when nothing else changed.

## Using uuid with random_id Instead

For most use cases, the `random_id` or `random_uuid` resource from the random provider is a better choice:

```hcl
# This generates a UUID once and keeps it stable
resource "random_uuid" "deployment_id" {}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    DeploymentId = random_uuid.deployment_id.result
    # Stable across plans - only changes if the random_uuid resource is tainted
  }
}

output "deployment_id" {
  value = random_uuid.deployment_id.result
}
```

## When uuid() Is Appropriate

There are legitimate cases where you want a new UUID every time:

### Forcing Resource Recreation

```hcl
# Force a null_resource to run on every apply
resource "null_resource" "always_run" {
  triggers = {
    run_id = uuid()  # New UUID = new trigger = resource recreated
  }

  provisioner "local-exec" {
    command = "echo Running deployment ${self.triggers.run_id}"
  }
}
```

### One-Time Provisioning Scripts

```hcl
# Generate a unique deployment ID for tracking
resource "null_resource" "deploy" {
  triggers = {
    deploy_id = uuid()
  }

  provisioner "local-exec" {
    command = <<-EOF
      ./deploy.sh \
        --deployment-id ${self.triggers.deploy_id} \
        --environment ${var.environment}
    EOF
  }
}
```

### Unique Naming for Temporary Resources

```hcl
locals {
  # Short unique suffix for resource names
  unique_suffix = substr(uuid(), 0, 8)
}

resource "aws_s3_bucket" "temp" {
  bucket = "temp-data-${local.unique_suffix}"

  tags = {
    Temporary = "true"
    Purpose   = "data-migration"
  }
}
```

## Preventing Unwanted Changes with lifecycle

If you need to use `uuid()` but do not want it to trigger updates after initial creation:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name     = "web-server"
    UniqueId = uuid()
  }

  lifecycle {
    ignore_changes = [tags["UniqueId"]]
  }
}
```

## Generating Multiple UUIDs

If you need several unique identifiers:

```hcl
resource "random_uuid" "instance_ids" {
  count = 5
}

resource "aws_instance" "fleet" {
  count         = 5
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name     = "fleet-${count.index + 1}"
    UniqueId = random_uuid.instance_ids[count.index].result
  }
}
```

## UUID in Local Values

You can store UUIDs in locals, but remember they change on every plan:

```hcl
locals {
  # This changes every time - fine for transient use
  plan_id = uuid()

  # If you need it in multiple places, reference the local
  # to at least get the same value within one evaluation
  deployment_tag = "deploy-${local.plan_id}"
}
```

## Combining UUID with Other Functions

Trim or modify the UUID for specific needs:

```hcl
locals {
  full_uuid = uuid()

  # Short ID (first 8 characters)
  short_id = substr(local.full_uuid, 0, 8)

  # UUID without hyphens
  compact_uuid = replace(local.full_uuid, "-", "")

  # Uppercase UUID
  upper_uuid = upper(local.full_uuid)

  # Use as part of a resource name
  resource_name = "app-${local.short_id}"
}
```

## UUID for Correlation IDs

When you need to correlate resources that are deployed together:

```hcl
resource "random_uuid" "correlation_id" {}

locals {
  correlation_tags = {
    CorrelationId = random_uuid.correlation_id.result
    DeployedBy    = "terraform"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags          = merge(local.correlation_tags, { Name = "app-server" })
}

resource "aws_db_instance" "db" {
  engine         = "postgres"
  instance_class = "db.t3.micro"
  tags           = merge(local.correlation_tags, { Name = "app-database" })
}

resource "aws_elasticache_cluster" "cache" {
  cluster_id    = "app-cache"
  engine        = "redis"
  node_type     = "cache.t3.micro"
  num_cache_nodes = 1
  tags           = merge(local.correlation_tags, { Name = "app-cache" })
}
```

## uuid vs random_uuid vs random_id

Here is when to use each:

```hcl
# uuid() - new value every evaluation
# Use for: triggers that should always fire, temporary/throwaway values
output "ephemeral" {
  value = uuid()
}

# random_uuid - stable UUID stored in state
# Use for: persistent unique identifiers, resource tags, correlation IDs
resource "random_uuid" "stable" {}
output "stable" {
  value = random_uuid.stable.result
}

# random_id - stable random bytes (not UUID format)
# Use for: short unique suffixes, bucket names, resource name suffixes
resource "random_id" "suffix" {
  byte_length = 4
}
output "suffix" {
  value = random_id.suffix.hex  # 8 hex characters
}
```

## Common Mistakes

1. Using `uuid()` where you need stability. If you want the same ID across multiple plans, use `random_uuid` instead.

2. Using `uuid()` in resource names without `ignore_changes`. This will try to recreate the resource on every apply, which may not be what you want.

3. Assuming `uuid()` returns the same value when referenced multiple times in a single plan. Each call to `uuid()` returns a different value. Store it in a local if you need to reference the same UUID in multiple places.

4. Forgetting that `uuid()` values are not cryptographically secure. They are fine for uniqueness but should not be used as secrets or tokens.

## Summary

The `uuid()` function generates a random v4 UUID on every call. Its main use is as a trigger for resources that should always re-execute. For persistent unique identifiers, use the `random_uuid` resource from the random provider instead, as it stores the value in state and keeps it stable across plans. The key rule: if you want the UUID to stay the same between runs, do not use `uuid()`.
