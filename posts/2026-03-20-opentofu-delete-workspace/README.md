# How to Delete a Workspace in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces

Description: Learn how to delete OpenTofu workspaces safely, including destroying resources before deletion and handling non-empty workspaces.

## Introduction

The `tofu workspace delete` command removes a workspace and its associated state. Before deleting a workspace, you should destroy any resources it manages to avoid orphaned infrastructure. The `default` workspace cannot be deleted.

## Basic Delete

```bash
# First, ensure the workspace is empty (all resources destroyed)

tofu workspace select old-feature
tofu destroy -auto-approve

# Switch away from the workspace before deleting
tofu workspace select default

# Delete the workspace
tofu workspace delete old-feature

# Output:
# Deleted workspace "old-feature"!
```

## You Cannot Delete the Current Workspace

```bash
# This fails if old-feature is the current workspace
tofu workspace delete old-feature
# Error: workspace "old-feature" is your active workspace
# Please switch to a different workspace first.
```

Always switch to a different workspace before deleting.

## You Cannot Delete the Default Workspace

```bash
tofu workspace delete default
# Error: default workspace cannot be deleted
```

## Force Delete (Skip State Check)

If the state is empty or you want to delete without verifying:

```bash
# -force skips the check for resources in state
tofu workspace delete -force old-feature
```

Use `-force` only when you are certain no infrastructure exists in the workspace, or when the state is corrupted and resources have already been cleaned up manually.

## Full Cleanup Workflow

```bash
#!/bin/bash
WORKSPACE="feature-branch-123"

# Switch to the workspace
tofu workspace select "$WORKSPACE"

# Destroy all resources
tofu destroy -auto-approve

# Switch to default
tofu workspace select default

# Delete the workspace
tofu workspace delete "$WORKSPACE"

echo "Workspace $WORKSPACE deleted."
```

## Deleting Multiple Workspaces

```bash
# Delete old feature workspaces in batch
for WS in feature-1 feature-2 feature-3; do
  tofu workspace select "$WS" 2>/dev/null || continue
  tofu destroy -auto-approve
  tofu workspace select default
  tofu workspace delete "$WS"
  echo "Deleted: $WS"
done
```

## What Happens to State After Delete

For local backends, the state directory is removed:
```text
terraform.tfstate.d/old-feature/   # This directory is deleted
```

For S3 backends, the state object is removed:
```text
s3://bucket/env:/old-feature/terraform.tfstate  # This object is deleted
```

## Verifying Deletion

```bash
tofu workspace list
# If old-feature no longer appears, it was deleted successfully
```

## Conclusion

Always destroy resources before deleting a workspace to avoid orphaned infrastructure. Use `tofu workspace delete -force` only for empty or irrecoverable workspaces. The deletion workflow is: select the workspace, run `tofu destroy`, switch to default, then run `tofu workspace delete`. This pattern ensures clean teardown of temporary environments like feature branches or ephemeral preview environments.
