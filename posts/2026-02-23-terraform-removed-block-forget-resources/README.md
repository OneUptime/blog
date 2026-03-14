# How to Use the removed Block to Forget Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Removed Block, Infrastructure as Code, Refactoring

Description: Learn how to use the Terraform removed block to stop managing resources without destroying them, keeping your infrastructure intact while cleaning up your configuration.

---

When you delete a resource block from a Terraform configuration, Terraform interprets that as "destroy this resource." But what if you want to stop managing a resource in Terraform without actually destroying it? Maybe another team is taking ownership, or you are migrating to a different tool, or the resource needs to persist independently. The `removed` block, introduced in Terraform 1.7, solves this problem declaratively.

This guide explains how the `removed` block works, when to use it, and how it compares to the older `terraform state rm` approach.

## The Problem: Removing Without Destroying

Consider this scenario. You have an S3 bucket managed by Terraform:

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "company-important-data"
}
```

If you simply delete this resource block and run `terraform apply`, Terraform will try to delete the S3 bucket and all its contents. That is almost certainly not what you want. You want Terraform to forget about the bucket while leaving it untouched in AWS.

## The removed Block

The `removed` block tells Terraform to remove a resource from its state without destroying the actual infrastructure:

```hcl
# Instead of deleting the resource block, replace it with a removed block
removed {
  from = aws_s3_bucket.data

  lifecycle {
    destroy = false
  }
}
```

When you run `terraform apply` with this configuration, Terraform:
1. Removes `aws_s3_bucket.data` from the state file
2. Does NOT send any destroy API calls to AWS
3. The S3 bucket continues to exist in your AWS account

## Step-by-Step Example

### Before: Resource Managed by Terraform

```hcl
# main.tf
resource "aws_vpc" "legacy" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "legacy-vpc"
  }
}

resource "aws_subnet" "legacy" {
  vpc_id     = aws_vpc.legacy.id
  cidr_block = "10.0.1.0/24"

  tags = {
    Name = "legacy-subnet"
  }
}
```

### After: Resources Forgotten by Terraform

```hcl
# main.tf - replace resource blocks with removed blocks
removed {
  from = aws_vpc.legacy

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_subnet.legacy

  lifecycle {
    destroy = false
  }
}
```

### Apply the Change

```bash
terraform plan
# Output:
# aws_vpc.legacy will no longer be managed by Terraform
# aws_subnet.legacy will no longer be managed by Terraform
#
# Plan: 0 to add, 0 to change, 0 to destroy.

terraform apply
# The resources are removed from state but still exist in AWS
```

### Clean Up

After the apply succeeds, you can remove the `removed` blocks from your configuration. They have served their purpose:

```hcl
# main.tf - now empty (or contains your other resources)
```

## Using removed with Modules

You can forget entire module instances:

```hcl
# The module used to be defined like this:
# module "old_monitoring" {
#   source = "./modules/monitoring"
#   # ...
# }

# Replace with a removed block referencing the module
removed {
  from = module.old_monitoring

  lifecycle {
    destroy = false
  }
}
```

This removes all resources that were part of the module from the state.

## Using removed with count and for_each

For resources that use `count` or `for_each`, you can forget specific instances:

```hcl
# Forget a specific count instance
removed {
  from = aws_instance.web[2]

  lifecycle {
    destroy = false
  }
}

# Forget a specific for_each instance
removed {
  from = aws_instance.web["us-west-2"]

  lifecycle {
    destroy = false
  }
}
```

Or forget all instances of a resource:

```hcl
# Forget all instances of a counted resource
removed {
  from = aws_instance.web

  lifecycle {
    destroy = false
  }
}
```

## removed vs terraform state rm

Before the `removed` block existed, the standard approach was the `terraform state rm` CLI command:

```bash
# Old approach: CLI command
terraform state rm aws_s3_bucket.data
```

The `removed` block has several advantages:

### 1. It Is Declarative and Reviewable

The `removed` block lives in your Terraform configuration files. It goes through code review just like any other change. Team members can see what is being forgotten and why.

```hcl
# This change is visible in a pull request
removed {
  from = aws_s3_bucket.data

  lifecycle {
    destroy = false
  }
}
```

Compare this to `terraform state rm`, which is an imperative command run by one person that modifies state directly.

### 2. It Works in CI/CD Pipelines

Since the `removed` block is part of the configuration, it works naturally in automated pipelines:

```yaml
# In a CI/CD pipeline, this just works
steps:
  - name: Terraform Plan
    run: terraform plan
  - name: Terraform Apply
    run: terraform apply -auto-approve
```

With `terraform state rm`, you would need a separate pipeline step before the plan.

### 3. It Handles Dependencies

Terraform understands the removed block in the context of the dependency graph. If other resources depend on the removed resource, Terraform handles the ordering correctly.

### 4. It Is Idempotent

Running `terraform apply` multiple times with a `removed` block is safe. The first apply removes the resource from state. Subsequent applies do nothing.

Running `terraform state rm` on a resource that is already removed produces an error.

## Combining removed with moved

You can use `removed` alongside `moved` blocks for complex refactoring:

```hcl
# First, rename the resource
moved {
  from = aws_instance.old_name
  to   = aws_instance.new_name
}

# Then forget a different resource that is no longer needed
removed {
  from = aws_security_group.deprecated

  lifecycle {
    destroy = false
  }
}
```

## When to Use removed

### Transferring Ownership

When another team or tool will manage a resource going forward:

```hcl
# The networking team will manage this VPC in their own Terraform workspace
removed {
  from = aws_vpc.shared

  lifecycle {
    destroy = false
  }
}
```

### Migrating to a Different IaC Tool

When moving resources to Pulumi, CloudFormation, or another tool:

```hcl
# These resources will be managed by CloudFormation going forward
removed {
  from = aws_dynamodb_table.users

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_dynamodb_table.orders

  lifecycle {
    destroy = false
  }
}
```

### Retiring Terraform Configurations

When decommissioning a Terraform workspace but wanting to keep the infrastructure:

```hcl
# Keep all resources but stop managing them
removed {
  from = aws_ecs_cluster.app

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_ecs_service.web

  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_lb.app

  lifecycle {
    destroy = false
  }
}
```

## What Happens If You Set destroy = true?

If you omit the `lifecycle` block or set `destroy = true`, the `removed` block behaves the same as deleting the resource block - Terraform will destroy the resource:

```hcl
# This WILL destroy the resource (same as just deleting the resource block)
removed {
  from = aws_instance.temp

  lifecycle {
    destroy = true
  }
}
```

This might seem pointless, but it can be useful for documentation purposes - making the intention to destroy explicit in the code.

## Important Considerations

1. After applying the `removed` block, the resource still exists in your cloud provider. Make sure someone or something is managing it.

2. If other resources in your Terraform state reference the removed resource, you need to update those references first or remove those resources too.

3. The `removed` block requires Terraform 1.7 or later. For older versions, use `terraform state rm`.

4. Removed blocks can be cleaned up from your configuration after the apply. They are only needed for the transition.

## Conclusion

The `removed` block is a welcome addition to Terraform's refactoring toolkit. It lets you stop managing resources without destroying them, and it does so in a declarative, reviewable way that fits naturally into your existing workflow. Whether you are transferring ownership, migrating tools, or cleaning up old configurations, the `removed` block gives you a safe path to separate your Terraform state from your running infrastructure.

For related state management operations, see our guide on [how to move resources between state files in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-move-resources-between-state-files/view).
