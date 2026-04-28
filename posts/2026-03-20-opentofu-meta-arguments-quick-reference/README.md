# How to Use the OpenTofu Meta-Arguments Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Meta-Arguments, Quick Reference, HCL, Infrastructure as Code

Description: A quick reference for all OpenTofu resource and module meta-arguments including count, for_each, depends_on, provider, lifecycle, and enabled.

## Introduction

Meta-arguments are special arguments available on all resource and module blocks regardless of provider. They control how OpenTofu creates and manages resources rather than configuring the resource itself.

## count

Create multiple instances of a resource (use for_each when possible).

```hcl
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags = {
    Name = "web-${count.index}"
  }
}

# Reference: aws_instance.web[0], aws_instance.web[1]

# Output:    aws_instance.web[*].id  (all IDs)
```

## for_each

Create instances from a map or set. Preferred over count.

```hcl
# for_each with a set
resource "aws_s3_bucket" "env" {
  for_each = toset(["dev", "staging", "prod"])
  bucket   = "myapp-${each.key}"
}

# for_each with a map
resource "aws_security_group_rule" "ingress" {
  for_each  = var.ingress_rules  # map(object)
  type      = "ingress"
  from_port = each.value.from_port
  to_port   = each.value.to_port
  protocol  = each.value.protocol
  # each.key = rule name, each.value = rule config
}

# Reference: aws_s3_bucket.env["dev"], aws_s3_bucket.env["prod"]
```

## depends_on

Declare explicit dependencies not expressed through attribute references.

```hcl
resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  role          = aws_iam_role.lambda.arn

  # The policy must be attached before Lambda can be created
  depends_on = [aws_iam_role_policy_attachment.lambda_s3]
}
```

## provider

Specify which provider instance to use (for multi-region or multi-account).

```hcl
resource "aws_s3_bucket" "west" {
  provider = aws.us-west-2  # uses the aliased provider
  bucket   = "myapp-us-west-2"
}
```

## lifecycle

Control resource lifecycle behavior.

```hcl
resource "aws_db_instance" "main" {
  # ...

  lifecycle {
    # Prevent accidental deletion
    prevent_destroy = true

    # Ignore changes to specific attributes (managed outside OpenTofu)
    ignore_changes = [tags["LastModified"], password]

    # Create new resource before destroying old one
    create_before_destroy = true

    # Custom condition to validate resource state
    precondition {
      condition     = var.instance_class != "db.t2.micro"
      error_message = "db.t2.micro is not allowed in production"
    }

    postcondition {
      condition     = self.availability_zone != ""
      error_message = "Database must have an availability zone assigned"
    }
  }
}
```

## enabled (OpenTofu 1.11+)

Conditionally enable or disable a resource. `enabled` is a `lifecycle` argument (not a top-level meta-argument) and cannot be combined with `count` or `for_each`.

```hcl
resource "aws_shield_protection" "main" {
  name         = "myapp-shield"
  resource_arn = aws_lb.main.arn

  lifecycle {
    enabled = var.environment == "prod"  # cleaner than count = condition ? 1 : 0
  }
}
```

## Meta-Arguments on Modules

All meta-arguments work on module blocks too. Note that modules use `providers` (plural, a map) rather than `provider`.

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  providers = {
    aws = aws.monitoring  # specific provider instance
  }

  depends_on = [module.cluster]  # explicit dependency

  for_each     = var.monitored_environments
  cluster_name = each.value.cluster_name
}

# Conditional module using lifecycle.enabled (OpenTofu 1.11+).
# Cannot be combined with count or for_each.
module "shield" {
  source = "./modules/shield"

  lifecycle {
    enabled = var.enable_shield
  }
}
```

## Meta-Argument Comparison

```text
Meta-argument       When to use
------------------  -----------
count               Simple numerical repetition, boolean flags
for_each            Map/set-driven repetition (preferred)
depends_on          Relationships not visible through attribute refs
provider/providers  Multi-region, multi-account, or multi-alias
lifecycle           Prevent destroy, ignore drift, ordering control
lifecycle.enabled   Conditional resource creation (cleaner than count=0/1)
```

## Summary

Meta-arguments give you control over how resources are created and managed independently of their provider-specific configuration. Prefer `for_each` over `count` for multiple instances (it produces cleaner resource addresses). Use `lifecycle.prevent_destroy = true` on production databases, `lifecycle.ignore_changes` for attributes managed outside OpenTofu, and `lifecycle.enabled` (OpenTofu 1.11+) for conditional resources instead of `count = condition ? 1 : 0`.
