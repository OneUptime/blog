# How to Delete a Workspace with terraform workspace delete

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, CLI Commands, State Management, Cleanup

Description: A comprehensive guide to safely deleting Terraform workspaces using terraform workspace delete, including handling resources, force deletion, and cleanup automation.

---

Workspaces accumulate over time. Feature branches get merged, test environments are no longer needed, and old staging environments sit around collecting dust. The `terraform workspace delete` command removes workspaces you no longer need. But deleting a workspace is not as simple as removing a directory - there are safety checks, resource considerations, and cleanup steps to understand. This post walks through all of it.

## Basic Usage

The command takes the name of the workspace to delete:

```bash
# Delete the "test" workspace
terraform workspace delete test
```

Output:

```text
Deleted workspace "test"!
```

Two important rules:

1. You cannot delete the workspace you are currently in. Switch to another one first.
2. You cannot delete the `default` workspace. It always exists.

```bash
# This fails - you are in the workspace you are trying to delete
terraform workspace show
# Output: test

terraform workspace delete test
# Error: Cannot delete the currently selected workspace

# Switch away first, then delete
terraform workspace select default
terraform workspace delete test
# Deleted workspace "test"!
```

## What Deletion Actually Does

When you delete a workspace, Terraform removes the state file associated with it. That is all it does. It does not destroy the infrastructure that the workspace was managing.

This is a critical point. If you had a workspace called "feature-xyz" with five EC2 instances tracked in its state, deleting the workspace removes the state file. Those five EC2 instances keep running in AWS. Terraform just forgets about them.

```text
Before deletion:
  Workspace "feature-xyz" state tracks:
    - aws_instance.web[0]    (i-abc123)
    - aws_instance.web[1]    (i-def456)
    - aws_vpc.main           (vpc-789)

After deletion:
  Workspace "feature-xyz" state is gone
  Resources i-abc123, i-def456, vpc-789 still exist in AWS
  They are now "orphaned" - no Terraform state references them
```

## The Safe Deletion Workflow

Always destroy the resources before deleting the workspace:

```bash
# Step 1: Switch to the workspace you want to clean up
terraform workspace select feature-xyz

# Step 2: Destroy all resources managed by this workspace
terraform destroy -var-file="envs/feature-xyz.tfvars" -auto-approve

# Step 3: Verify the state is empty
terraform state list
# (should show nothing)

# Step 4: Switch to another workspace
terraform workspace select default

# Step 5: Delete the now-empty workspace
terraform workspace delete feature-xyz
```

## Deleting a Workspace with Resources (Force Delete)

If a workspace still tracks resources but you want to delete it anyway, Terraform will refuse:

```bash
terraform workspace delete staging
```

Output:

```text
Workspace "staging" is not empty.

To delete a workspace with existing resources, use the -force flag.
```

The `-force` flag overrides this safety check:

```bash
# Force delete a workspace that still has resources in its state
terraform workspace delete -force staging
```

This deletes the state without destroying the infrastructure. Use this with extreme caution - you will have orphaned resources in your cloud account that are no longer tracked by any state file.

When might you actually want `-force`?

- You have already manually deleted the resources outside of Terraform
- You are migrating state to a different backend and have already imported elsewhere
- The resources were in a sandbox account that has been terminated

## Cleanup Scripts

### Delete All Feature Branch Workspaces

```bash
#!/bin/bash
# cleanup-feature-workspaces.sh
# Destroy resources and delete all feature-* workspaces

set -euo pipefail

ORIGINAL=$(terraform workspace show)

# Find all feature branch workspaces
FEATURE_WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//' | grep '^feature-')

if [ -z "$FEATURE_WORKSPACES" ]; then
  echo "No feature workspaces found."
  exit 0
fi

echo "Found feature workspaces:"
echo "$FEATURE_WORKSPACES"
echo ""

for WS in $FEATURE_WORKSPACES; do
  echo "Processing workspace: $WS"

  # Switch to the workspace
  terraform workspace select "$WS"

  # Check if it has resources
  RESOURCE_COUNT=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')

  if [ "$RESOURCE_COUNT" -gt "0" ]; then
    echo "  Destroying $RESOURCE_COUNT resources..."
    terraform destroy -auto-approve
  else
    echo "  No resources to destroy."
  fi

  # Switch away and delete
  terraform workspace select default
  terraform workspace delete "$WS"
  echo "  Deleted workspace: $WS"
  echo ""
done

# Return to original workspace if it still exists
if terraform workspace list | sed 's/^[ *]*//' | grep -qx "$ORIGINAL"; then
  terraform workspace select "$ORIGINAL"
fi

echo "Cleanup complete."
```

### Delete Workspaces Older Than N Days

This pattern works if your workspace names include dates:

```bash
#!/bin/bash
# cleanup-old-workspaces.sh
# Delete workspaces with date prefixes older than 30 days

MAX_AGE_DAYS=30
CUTOFF_DATE=$(date -d "-${MAX_AGE_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${MAX_AGE_DAYS}d +%Y%m%d)

WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//' | grep -v '^default$')

for WS in $WORKSPACES; do
  # Extract date from workspace name (e.g., feature-login-20260115)
  WS_DATE=$(echo "$WS" | grep -oE '[0-9]{8}$')

  if [ -n "$WS_DATE" ] && [ "$WS_DATE" -lt "$CUTOFF_DATE" ]; then
    echo "Workspace $WS is older than $MAX_AGE_DAYS days (created: $WS_DATE)"

    terraform workspace select "$WS"
    terraform destroy -auto-approve
    terraform workspace select default
    terraform workspace delete "$WS"

    echo "Deleted: $WS"
  fi
done
```

## Handling Deletion Across Backends

### Local Backend

When deleting with the local backend, the subdirectory under `terraform.tfstate.d` is removed:

```bash
# Before deletion
ls terraform.tfstate.d/
# dev/  staging/  feature-xyz/

terraform workspace select default
terraform workspace delete feature-xyz

# After deletion
ls terraform.tfstate.d/
# dev/  staging/
```

### S3 Backend

With S3, the state file at the workspace's key path is deleted:

```bash
# Before deletion, S3 has:
# s3://bucket/env:/feature-xyz/app/terraform.tfstate

terraform workspace delete feature-xyz

# After deletion, that S3 object is removed
```

Note that S3 versioning may keep the deleted state file as a previous version. If you need to fully purge it, you will need to delete the S3 object versions separately.

### Terraform Cloud

With Terraform Cloud, workspace deletion removes the workspace from the Terraform Cloud organization. This also removes all state versions, run history, and variables associated with that workspace.

## CI/CD Pipeline Integration

Automate workspace cleanup as part of your CI/CD workflow:

```yaml
# GitHub Actions - Delete workspace when PR is closed
name: Cleanup Feature Workspace

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Init
        run: terraform init -input=false

      - name: Destroy and Delete Workspace
        env:
          WORKSPACE: pr-${{ github.event.pull_request.number }}
        run: |
          # Check if workspace exists
          if terraform workspace list | sed 's/^[ *]*//' | grep -qx "$WORKSPACE"; then
            terraform workspace select "$WORKSPACE"
            terraform destroy -auto-approve
            terraform workspace select default
            terraform workspace delete "$WORKSPACE"
            echo "Cleaned up workspace: $WORKSPACE"
          else
            echo "Workspace $WORKSPACE does not exist, nothing to clean up"
          fi
```

## Recovering a Deleted Workspace

If you accidentally delete a workspace, recovery depends on your backend:

**Local backend:** If you have backups or the filesystem supports recovery, restore the files from `terraform.tfstate.d/<workspace-name>/`.

**S3 with versioning:** List the object versions and restore the previous version:

```bash
# List versions of the deleted state file
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix "env:/deleted-workspace/app/terraform.tfstate"

# Restore by copying a previous version
aws s3api copy-object \
  --bucket my-terraform-state \
  --copy-source "my-terraform-state/env:/deleted-workspace/app/terraform.tfstate?versionId=xxxxx" \
  --key "env:/deleted-workspace/app/terraform.tfstate"

# Recreate the workspace
terraform workspace new deleted-workspace
```

**No versioning or backups:** The state is gone. You will need to import the resources back into a new workspace manually.

## Troubleshooting

**"Cannot delete the currently selected workspace."** Switch to a different workspace first with `terraform workspace select default`.

**"Workspace does not exist."** Check spelling. Run `terraform workspace list` to see available workspaces.

**"Workspace is not empty."** The workspace still tracks resources. Either destroy them first or use `-force` if you are sure.

## Conclusion

Deleting workspaces is straightforward but demands care. Always destroy the managed resources before deleting the workspace to avoid orphaned infrastructure. Use the `-force` flag only when you understand the consequences. Build cleanup automation for feature-branch workspaces to keep your workspace list manageable and your cloud bill under control. For checking which workspace you are currently in, see our post on [showing the current workspace](https://oneuptime.com/blog/post/2026-02-23-how-to-show-current-workspace-with-terraform-workspace-show/view).
