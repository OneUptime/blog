# How to Handle Orphaned Resources in State in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Orphaned Resources, State Management, Infrastructure as Code

Description: Learn how to identify and handle orphaned resources in OpenTofu state - resources that exist in state but no longer in configuration or in the cloud.

## Introduction

Orphaned resources are state file entries that no longer correspond to a resource in your configuration or that point to a cloud resource that was deleted outside OpenTofu. They cause spurious diffs, unexpected recreation plans, and cluttered state.

## Types of Orphans

1. **Configuration orphan**: Resource is in state but no longer in `.tf` files → OpenTofu will plan to destroy it
2. **Cloud orphan**: Resource is in state and config but was deleted manually → Refresh will detect the drift, and a normal plan will typically propose recreating it

## Identifying Orphaned Resources

```bash
# List all resources in state

tofu state list

# Check for resources that no longer exist in config
tofu plan   # Shows resources to be destroyed (removed from config)

# Check for resources deleted outside OpenTofu
tofu plan -refresh-only   # Shows only drift - resources deleted/changed externally
```

## Handling Type 1: Resource Removed from Config (Intentional)

If you intentionally removed a resource from config and want to destroy it:

```bash
# Review what will be destroyed
tofu plan

# Apply the destruction
tofu apply
```

## Handling Type 1: Resource Removed from Config (Keep in Cloud)

If the resource was removed from config accidentally or you want to keep it without managing it:

```bash
# Remove it from state without destroying the cloud resource
tofu state rm aws_instance.old_web_server

# Verify it's gone from state
tofu state list | grep old_web_server
```

## Handling Type 2: Cloud Resource Deleted Externally

If OpenTofu's state references a resource that was deleted in the cloud console:

```bash
# Run a refresh-only apply to detect the missing resource and update state
tofu apply -refresh-only

# OpenTofu will show the resource as missing and offer to update state
# If it is still in config, the next normal plan will typically propose recreating it

# Or remove it from state manually with the same result
tofu state rm aws_instance.deleted_externally
```

## Bulk Removal of Orphaned State Entries

```bash
# List all state entries matching a pattern
tofu state list | grep "aws_instance"

# Remove multiple orphaned instances
tofu state rm 'aws_instance.old_worker[0]'
tofu state rm 'aws_instance.old_worker[1]'
tofu state rm 'aws_instance.old_worker[2]'

# Or remove all with a specific prefix using a loop
for resource in $(tofu state list | grep "aws_instance.old_worker"); do
  tofu state rm "$resource"
done
```

## Guard Critical Resources: Use lifecycle.prevent_destroy

```hcl
resource "aws_ecs_cluster" "main" {
  name = "prod-cluster"

  lifecycle {
    # Error if a plan would destroy or replace this resource while it remains in config
    prevent_destroy = true
  }
}
```

This protects against planned destroys and replacements, but it does not stop OpenTofu from destroying the resource if you remove the entire `resource` block from configuration.

## Preventing Orphans: Review Planned Destroys Regularly

```bash
# Quick heuristic to review resources slated for destruction
tofu plan -no-color 2>&1 | grep "will be destroyed" > orphans-to-review.txt
cat orphans-to-review.txt
```

## Conclusion

Handle orphaned resources by deciding whether to destroy them (remove from config and apply), keep them unmanaged (use `tofu state rm`), or re-import them (use `tofu import`). Run `tofu plan -refresh-only` regularly to detect externally deleted resources before they lead to unexpected recreation plans, and use `lifecycle.prevent_destroy` to guard critical resources against accidental destroys or replacements while the resource block remains in configuration.
