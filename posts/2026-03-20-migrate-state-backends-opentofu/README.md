# How to Migrate State Between Backends in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to safely migrate your OpenTofu state from one backend to another - for example from local to S3, or from S3 to GCS - without losing any state data.

## Introduction

As your infrastructure evolves, you may need to change the backend where your state is stored. Common migrations include moving from local file storage to S3 for team collaboration, from one cloud provider to another, or changing the key structure within the same backend. OpenTofu handles these migrations safely through `tofu init`.

## Common Migration Scenarios

- Local → S3 (team onboarding)
- S3 → GCS (cloud provider change)
- S3 → Terraform Cloud / OpenTofu Cloud
- Changing the S3 key or bucket

## Step 1: Back Up Current State

Always back up before migrating:

```bash
# Pull and save current state

tofu state pull > state-before-migration.tfstate

# Verify the backup
tofu show -json > state-before-migration.json
```

## Step 2: Configure the New Backend

Update your `backend.tf` (or equivalent) to point to the new backend:

```hcl
# Before: local backend
# terraform {
#   backend "local" {
#     path = "terraform.tfstate"
#   }
# }

# After: S3 backend
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

## Step 3: Run tofu init to Migrate

When the backend configuration has changed, `tofu init` requires you to explicitly pass either `-migrate-state` or `-reconfigure`. Use `-migrate-state` to copy state from the old backend to the new one:

```bash
tofu init -migrate-state

# Output:
# Initializing the backend...
#
# Do you want to copy existing state to the new backend?
#   Pre-existing state was found while migrating the previous "local" backend to the
#   newly configured "s3" backend. No existing state was found in the newly configured
#   "s3" backend. Do you want to copy this state to the new backend?
#
#   Enter a value: yes
```

Type `yes` to copy the state to the new backend.

## Step 4: Verify Migration Success

Confirm the state was migrated correctly:

```bash
# Verify state is accessible in the new backend
tofu state list

# Run a plan - should show no changes
tofu plan

# Confirm the state count matches
tofu state list | wc -l
```

## Migrating Between S3 Buckets or Keys

If you're changing the bucket or key within S3:

```hcl
# Old backend configuration
terraform {
  backend "s3" {
    bucket = "old-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

```hcl
# New backend configuration
terraform {
  backend "s3" {
    bucket = "new-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}
```

```bash
# Run init to trigger migration
tofu init -migrate-state
```

## Migrating from S3 to GCS

```hcl
# New GCS backend
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"
  }
}
```

```bash
tofu init -migrate-state
```

## Forcing a Re-initialization

If the migration fails or you need to force re-initialization:

```bash
# Force re-init without prompting
tofu init -force-copy

# Reconfigure backend without migrating (resets to new backend, loses old state link)
tofu init -reconfigure
```

Use `-reconfigure` when you want to point to a backend that already has the correct state (e.g., after a team member already migrated).

## Handling Migration Failures

If the migration partially fails:

```bash
# Check if state exists in both backends
# Old: pull from the old backend manually
# New: check the new backend

# Push the backup state to the new backend manually
tofu state push state-before-migration.tfstate
```

## Post-Migration Cleanup

After confirming the new backend works:

```bash
# Delete the old local state file (after migrating from local)
rm terraform.tfstate
rm terraform.tfstate.backup

# Or archive the old S3 key
aws s3 mv \
  s3://old-bucket/terraform.tfstate \
  s3://old-bucket/archive/terraform.tfstate.old
```

## Conclusion

Migrating OpenTofu state between backends is a well-supported operation that OpenTofu handles during `tofu init -migrate-state`. The key steps are backing up first, updating the backend configuration, running `tofu init -migrate-state` and confirming the migration, then verifying with `tofu plan`. Following this process ensures zero data loss during backend transitions.
