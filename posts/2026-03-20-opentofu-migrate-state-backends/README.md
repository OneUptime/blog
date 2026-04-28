# How to Migrate State Between Backends in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Backend

Description: Learn how to migrate OpenTofu state between backends safely, including from local to S3, between S3 buckets, and across different backend types.

## Introduction

Backend migrations happen when you adopt remote state for the first time, switch cloud providers, move to a new account, or restructure your infrastructure. OpenTofu's built-in migration support makes this safe and straightforward.

## Basic Migration with tofu init -migrate-state

The simplest migration is changing the backend configuration and running `tofu init`:

```bash
# Step 1: Update backend.tf to the new backend

# (change the bucket, region, or backend type)

# Step 2: Run init with migration flag
tofu init -migrate-state

# OpenTofu will prompt:
# Do you want to copy existing state to the new backend?
# Enter a value: yes
```

## Migration 1: Local to S3

```hcl
# Before: no backend block (uses local terraform.tfstate)

# After: backend.tf
terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tofu-state-lock"
  }
}
```

```bash
# Migrate local state to S3
tofu init -migrate-state
# Confirm: yes

# Verify
aws s3 ls s3://my-tofu-state/production/
# terraform.tfstate
```

## Migration 2: Between S3 Buckets

```bash
# Step 1: Take a backup
tofu state pull > pre-migration-backup.json

# Step 2: Update backend configuration to new bucket
# Edit backend.tf with new bucket name/key

# Step 3: Migrate
tofu init -migrate-state
```

## Migration 3: S3 to GCS

```hcl
# From:
terraform {
  backend "s3" {
    bucket = "old-state-bucket"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

# To:
terraform {
  backend "gcs" {
    bucket = "new-gcs-state-bucket"
    prefix = "terraform/state"
  }
}
```

```bash
tofu init -migrate-state
```

## Manual Migration (Without init -migrate-state)

For more control over the migration:

```bash
# Step 1: Pull state from source
OLD_BACKEND_CONFIG="-backend-config=old-backend.hcl"
tofu state pull > state-to-migrate.json

# Step 2: Configure new backend
# Update backend.tf

# Step 3: Initialize new backend without migration
tofu init -reconfigure

# Step 4: Push state manually
tofu state push state-to-migrate.json

# Step 5: Verify
tofu state list
tofu plan  # Should show no changes
```

## Splitting State During Migration

If you're splitting one large state into multiple smaller states:

```bash
# Pull full state
tofu state pull > full-state.json

# Initialize first sub-configuration
cd networking/
tofu init

# Move specific resources to networking state
tofu state mv \
  -state=../full-state.json \
  -state-out=terraform.tfstate \
  module.vpc module.vpc

# Verify networking state
tofu state list
tofu plan

# Repeat for other sub-configurations
```

## Verification After Migration

```bash
# Always verify after migration
tofu state list  # Resources should be present
tofu plan        # Should show no changes (infrastructure unchanged)

# Compare counts
echo "Expected: $(cat pre-migration-backup.json | jq '.resources | length')"
echo "Actual:   $(tofu state pull | jq '.resources | length')"
```

## Conclusion

Backend migrations are low-risk when done with OpenTofu's built-in migration support. Always back up state before migrating, use `tofu init -migrate-state` for simple backend changes, and verify with `tofu plan` after migration to confirm state integrity. For complex migrations (splitting state, changing structure), use the manual pull-push approach for maximum control.
