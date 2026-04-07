# How to Use the OpenTofu Lifecycle Arguments Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Lifecycle, Quick Reference, Resource Management, Infrastructure as Code

Description: A quick reference for all OpenTofu lifecycle block arguments including prevent_destroy, ignore_changes, create_before_destroy, and condition checks.

## Introduction

The `lifecycle` block in OpenTofu resource declarations controls how the resource is created, updated, and destroyed. This quick reference covers all lifecycle arguments with practical usage examples.

## prevent_destroy

Prevent a resource from being accidentally destroyed.

```hcl
resource "aws_db_instance" "production" {
  identifier = "myapp-prod-db"
  # ...

  lifecycle {
    prevent_destroy = true
  }
}

# tofu destroy will fail with:

# Error: Instance cannot be destroyed
# Resource ... has lifecycle.prevent_destroy set to true.

# To destroy, you must first remove prevent_destroy from config
# then run tofu apply, THEN tofu destroy
```

## ignore_changes

Tell OpenTofu to ignore changes to specific attributes.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Ignore multiple attributes (AMI managed by auto-update,
    # user_data and tags managed externally)
    ignore_changes = [ami, user_data, tags["LastModified"]]
  }

  # Alternative: Ignore all attributes (use sparingly - defeats IaC purpose)
  # lifecycle {
  #   ignore_changes = all
  # }
}
```

## create_before_destroy

Create the replacement resource before destroying the old one.

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Ensures zero-downtime replacements
    create_before_destroy = true
  }
}

resource "aws_acm_certificate" "main" {
  domain_name       = var.domain
  validation_method = "DNS"

  lifecycle {
    # New cert must be issued before old one is deleted
    create_before_destroy = true
  }
}
```

## replace_triggered_by

Trigger resource replacement when other resources change.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Replace the instance when the launch template version changes
    replace_triggered_by = [aws_launch_template.app.latest_version]
  }
}
```

## precondition

Validate inputs before creating or updating a resource.

```hcl
resource "aws_db_instance" "main" {
  instance_class = var.instance_class

  lifecycle {
    precondition {
      condition     = !startswith(var.instance_class, "db.t2.")
      error_message = "db.t2.* instances are not allowed for production databases. Use db.t3.* or better."
    }

    precondition {
      condition     = var.allocated_storage >= 100
      error_message = "Production databases require at least 100 GB of storage."
    }
  }
}
```

## postcondition

Validate resource state after creation or update.

```hcl
resource "aws_db_instance" "main" {
  # ...

  lifecycle {
    postcondition {
      condition     = self.status == "available"
      error_message = "Database must be in 'available' status after creation."
    }

    postcondition {
      condition     = self.multi_az == true
      error_message = "Production database must have Multi-AZ enabled."
    }
  }
}
```

## Common Lifecycle Patterns

```hcl
# Pattern 1: Immutable infrastructure (replace, don't update)
resource "aws_instance" "web" {
  lifecycle {
    create_before_destroy = true
  }
}

# Pattern 2: Protect production resources
resource "aws_rds_cluster" "prod" {
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [engine_version]  # managed by maintenance window
  }
}

# Pattern 3: Externally managed attributes
resource "aws_autoscaling_group" "app" {
  lifecycle {
    ignore_changes = [desired_capacity]  # managed by autoscaler
  }
}

# Pattern 4: Validate before apply
resource "aws_iam_policy" "admin" {
  lifecycle {
    precondition {
      condition     = var.environment != "prod" || var.approved_by != ""
      error_message = "Production IAM policies require an approver"
    }
  }
}
```

## Summary

The `lifecycle` block provides fine-grained control over how OpenTofu manages resource changes. Use `prevent_destroy = true` for production databases and other critical resources, `ignore_changes` for attributes managed outside OpenTofu, `create_before_destroy = true` for resources requiring zero-downtime replacement, and `precondition`/`postcondition` for inline validation that enforces organizational policies at the resource level.
