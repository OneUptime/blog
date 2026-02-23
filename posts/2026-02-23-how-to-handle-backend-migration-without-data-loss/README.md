# How to Handle Backend Migration Without Data Loss

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Backend Migration, State Management, Infrastructure as Code, DevOps

Description: Learn how to safely migrate Terraform state between backends without losing data, including step-by-step procedures for common migration scenarios like local to S3, S3 to Terraform Cloud, and more.

---

Migrating your Terraform backend means moving your state file from one storage system to another. This happens when you outgrow local state, switch cloud providers, adopt Terraform Cloud, or consolidate backends across teams. If done wrong, you can lose your state file and orphan every resource Terraform manages.

This guide covers safe migration procedures for the most common backend transitions, with rollback strategies for when things go sideways.

## Before You Start

Every backend migration should begin with these steps:

```bash
# Step 1: Ensure no one else is running Terraform
# Communicate with your team and pause CI/CD pipelines

# Step 2: Back up the current state
terraform state pull > state-backup-$(date +%Y%m%d_%H%M%S).json

# Step 3: Verify the backup is complete
jq '.resources | length' state-backup-*.json
# Compare with:
terraform state list | wc -l

# Step 4: Store the backup somewhere safe (not in the repo)
aws s3 cp state-backup-*.json s3://my-backups/terraform/
```

Never skip the backup step. Even if the migration succeeds, having a backup lets you verify nothing was lost.

## Local to S3 Migration

This is the most common migration path. You are moving from a local `terraform.tfstate` file to an S3 remote backend.

```hcl
# backend.tf - BEFORE (local)
# No backend block, or:
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

```hcl
# backend.tf - AFTER (S3)
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Run the migration:

```bash
# Terraform detects the backend change and asks to migrate
terraform init

# Output:
# Initializing the backend...
# Do you want to copy existing state to the new backend?
#   Enter "yes" to copy and "no" to start with an empty state.
#
# Enter a value: yes

# Verify the migration worked
terraform plan
# Should show no changes
```

After confirming success, remove the local state file:

```bash
# Only after verifying the remote state is correct
rm terraform.tfstate
rm terraform.tfstate.backup
```

## S3 to Terraform Cloud Migration

Moving from S3 to Terraform Cloud requires an intermediate step because Terraform Cloud uses a different backend type:

```hcl
# backend.tf - BEFORE (S3)
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# backend.tf - AFTER (Terraform Cloud)
terraform {
  cloud {
    organization = "myorg"

    workspaces {
      name = "prod-app"
    }
  }
}
```

```bash
# Pull the current state from S3
terraform state pull > current-state.json

# Update the backend configuration to Terraform Cloud
# Then initialize with the new backend
terraform init

# If Terraform offers to migrate, accept it
# If not, push the state manually:
terraform state push current-state.json

# Verify
terraform plan
```

## S3 to GCS Migration

Cross-cloud backend migrations require pulling and pushing state manually:

```bash
# Step 1: Pull state from the current backend
terraform state pull > migration-state.json

# Step 2: Update backend.tf
```

```hcl
# backend.tf - AFTER (GCS)
terraform {
  backend "gcs" {
    bucket = "myorg-terraform-state"
    prefix = "prod/app"
  }
}
```

```bash
# Step 3: Initialize the new backend
terraform init -reconfigure

# When asked about migrating state, choose "no" (we will push manually)
# This is safer because we control the exact state being pushed

# Step 4: Push the state to the new backend
terraform state push migration-state.json

# Step 5: Verify
terraform plan
# Should show no changes
```

## Migrating Between S3 Buckets

Sometimes you need to move state to a different S3 bucket without changing the backend type:

```hcl
# backend.tf - BEFORE
terraform {
  backend "s3" {
    bucket = "old-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```hcl
# backend.tf - AFTER
terraform {
  backend "s3" {
    bucket = "new-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Terraform handles this automatically
terraform init -migrate-state

# Answer "yes" when prompted
# Verify
terraform plan
```

The `-migrate-state` flag tells Terraform to move state from the old backend to the new one. This is the recommended approach for same-type backend changes.

## Handling Migration Failures

If the migration fails partway through, do not panic. Your backup saves you.

### Scenario: State exists in neither backend

```bash
# The migration started but did not complete
# Your state is in the backup file

# Revert to the old backend configuration
git checkout backend.tf

# Re-initialize with the old backend
terraform init -reconfigure

# Push the backup state
terraform state push state-backup-20260223_100000.json

# Verify
terraform plan
```

### Scenario: State exists in both backends

```bash
# Terraform wrote to the new backend but did not clean up the old one
# This is actually the safest failure mode

# Check both backends
# Old backend:
terraform init -reconfigure -backend-config="bucket=old-terraform-state"
terraform state pull | jq '.serial'

# New backend:
terraform init -reconfigure -backend-config="bucket=new-terraform-state"
terraform state pull | jq '.serial'

# Keep the one with the higher serial number (most recent)
```

### Scenario: Lock is stuck

```bash
# The migration crashed and left a lock behind
terraform force-unlock LOCK_ID

# Then retry the migration
terraform init -migrate-state
```

## Migrating Multiple Workspaces

If you use Terraform workspaces, each workspace has its own state that needs migration:

```bash
#!/bin/bash
# migrate-workspaces.sh - Migrate all workspaces to a new backend

set -euo pipefail

# Back up all workspace states first
for workspace in $(terraform workspace list | tr -d '* '); do
  if [ -n "$workspace" ]; then
    echo "Backing up workspace: $workspace"
    terraform workspace select "$workspace"
    terraform state pull > "backup-${workspace}.json"
  fi
done

# Update backend.tf with the new configuration
# (do this manually or via script)

# Migrate each workspace
for workspace in $(ls backup-*.json | sed 's/backup-//' | sed 's/.json//'); do
  echo "Migrating workspace: $workspace"
  terraform workspace select "$workspace" 2>/dev/null || terraform workspace new "$workspace"
  terraform state push "backup-${workspace}.json"

  # Verify
  terraform plan
  echo "Workspace $workspace migrated successfully"
done
```

## Zero-Downtime Migration

For production systems where you cannot afford any downtime, use a staged approach:

```bash
# Stage 1: Set up the new backend alongside the old one
# Create the new bucket/storage and configure access

# Stage 2: Copy state to the new backend without switching
terraform state pull > current-state.json

# Upload to the new backend using the cloud CLI
aws s3 cp current-state.json \
  s3://new-terraform-state/prod/terraform.tfstate

# Stage 3: Verify the copied state is valid
# Temporarily point to the new backend and check
terraform init -reconfigure \
  -backend-config="bucket=new-terraform-state"
terraform plan
# Should show no changes

# Stage 4: Switch over
# Update backend.tf and run init
terraform init -migrate-state

# Stage 5: Clean up the old backend after confirming everything works
# Wait at least a week before deleting the old state
```

## Post-Migration Checklist

After every backend migration, verify these items:

```bash
# 1. State is readable
terraform state list

# 2. Plan shows no changes
terraform plan

# 3. Locking works
terraform plan  # Should acquire and release lock without errors

# 4. All resources are accounted for
terraform state list | wc -l
# Compare with the backup:
jq '.resources | length' state-backup-*.json

# 5. CI/CD pipelines are updated with new backend credentials
# Update environment variables, IAM policies, etc.

# 6. Team members have re-initialized
# Everyone needs to run terraform init with the new backend
```

## Best Practices

1. **Always back up state before migrating.** Store backups outside both the old and new backends.
2. **Communicate with your team** before migrating. Stop all other Terraform operations.
3. **Use `terraform init -migrate-state`** for same-type backend changes.
4. **Pull and push manually** for cross-type migrations for more control.
5. **Verify with `terraform plan`** after every migration. Zero changes means success.
6. **Keep the old backend accessible** for at least a week after migration in case you need to roll back.
7. **Update CI/CD pipelines** to use the new backend credentials immediately after migration.

Backend migrations are nerve-wracking, but they are straightforward when you follow a disciplined process. The backup is your safety net - make sure it is solid before you start.
