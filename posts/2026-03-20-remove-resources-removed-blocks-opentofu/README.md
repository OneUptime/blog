# How to Remove Resources with removed Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Removed, Resource, Refactoring, HCL, Infrastructure as Code, DevOps

Description: Learn how to use removed blocks in OpenTofu to stop managing a resource without destroying it, keeping the infrastructure intact.

---

When you delete a resource block from your OpenTofu configuration, the next `tofu apply` destroys that resource. Sometimes you want to stop managing a resource without deleting it - for example, when transferring management to another team or configuration. The `removed` block lets you do this cleanly.

---

## The Problem: Deleting a Resource Block Destroys Infrastructure

```hcl
# This resource is in your config:

resource "aws_s3_bucket" "legacy" {
  bucket = "company-legacy-data"
}

# If you delete this block, the next apply will destroy the bucket!
# You don't want that - you just want to stop managing it.
```

---

## Solution: removed Block

```hcl
# Instead of deleting the resource block, add a removed block
# Remove the resource "aws_s3_bucket" "legacy" block from your config
# and add this:

removed {
  from = aws_s3_bucket.legacy

  lifecycle {
    destroy = false   # do NOT destroy the resource - just remove from state
  }
}
```

After applying with this `removed` block:
- The S3 bucket **still exists** in AWS
- OpenTofu no longer tracks it in state
- Future plans won't show it

---

## removed with destroy = true (Controlled Deletion)

```hcl
# Use removed block to explicitly control how a resource is deleted
# This is equivalent to just deleting the resource block, but more explicit

removed {
  from = aws_db_instance.deprecated

  lifecycle {
    destroy = true   # explicitly destroy when removed
  }
}
```

---

## Removing a Module's Resources

```hcl
# Stop managing all resources from a module
removed {
  from = module.old_networking

  lifecycle {
    destroy = false   # keep resources, stop managing them
  }
}
```

---

## Workflow for Removing a Resource

```bash
# Step 1: Add the removed block (replace the resource block)
# In main.tf:
# removed {
#   from = aws_s3_bucket.legacy
#   lifecycle { destroy = false }
# }

# Step 2: Preview the operation
tofu plan
# Shows: aws_s3_bucket.legacy will be removed from state (not destroyed)

# Step 3: Apply
tofu apply

# Step 4: Verify resource still exists in AWS
aws s3 ls | grep company-legacy-data
# 2024-01-01 12:34:56 company-legacy-data

# Step 5: Remove the removed block from config (cleanup)
# The resource is no longer in state, so it won't be tracked going forward
```

---

## Difference: removed vs tofu state rm

```text
# Option 1: removed block (declarative, auditable, good for teams)
removed {
  from = aws_instance.old
  lifecycle { destroy = false }
}

# Option 2: state rm command (imperative, immediate)
tofu state rm aws_instance.old

# With tofu state rm, also remove or update the matching resource block.
# Otherwise, the next tofu plan will propose creating the resource again.
#
# Use removed block when you want the change tracked in version control
# Use state rm for quick one-off state operations
```

---

## Summary

`removed` blocks provide a declarative way to stop managing resources without destroying them. Set `lifecycle { destroy = false }` to preserve the infrastructure while removing it from OpenTofu's state. This is particularly useful when transferring resource management to another team, consolidating configurations, or retiring old modules. After applying, clean up by removing the `removed` block itself.
