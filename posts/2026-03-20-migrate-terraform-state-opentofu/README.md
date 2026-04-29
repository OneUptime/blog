# How to Migrate Terraform State to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Migration, State Management, Infrastructure as Code

Description: Learn how to safely migrate existing Terraform state files to OpenTofu - including state file format compatibility, backend migration, and validation steps to ensure continuity.

## Introduction

Terraform and OpenTofu share the same state file format (JSON). Migrating state is straightforward - OpenTofu reads and writes the same `.tfstate` format. The main tasks are: replacing the `terraform` binary with `tofu`, running `tofu init`, and validating the state is readable before making any changes.

## Step 1: Install OpenTofu Alongside Terraform

```bash
# macOS

brew install opentofu

# Linux (standalone install - the script requires --install-method)
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
chmod +x install-opentofu.sh
./install-opentofu.sh --install-method standalone

# Verify both tools are available
terraform --version   # Keep Terraform available during migration
tofu --version
```

## Step 2: Verify State Compatibility

OpenTofu reads Terraform state files directly. Test in a non-production environment first:

```bash
cd your-terraform-project/

# Run tofu plan against the existing Terraform state - should show no changes
tofu init
tofu plan

# Expected output:
# No changes. Your infrastructure matches the configuration.
```

If `tofu plan` shows no changes, the state is fully compatible.

## Step 3: Remote Backend Migration

For remote backends, no state migration is needed - OpenTofu points to the same backend:

```hcl
# backend.tf - same configuration works for both Terraform and OpenTofu
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"  # Same bucket
    key            = "production/terraform.tfstate" # Same key
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

```bash
# Re-initialize with OpenTofu (downloads providers via OpenTofu registry)
tofu init

# Validate state is intact
tofu show   # Should display current state

# Run plan - should be no changes
tofu plan
```

## Step 4: Handle Provider Registry Changes

Some providers moved to different registry namespaces between Terraform and OpenTofu. Check your `required_providers`:

```hcl
# Before: Terraform default registry
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

```bash
# OpenTofu downloads from registry.opentofu.org by default
# Most providers (including hashicorp/*) are mirrored there
tofu init

# If a provider is not found, check the registry
# Or specify registry.terraform.io explicitly:
```

```hcl
# Force use of Terraform registry (for providers not yet in OpenTofu registry)
terraform {
  required_providers {
    somevendor = {
      source  = "registry.terraform.io/somevendor/someprovider"
      version = "~> 1.0"
    }
  }
}
```

## Step 5: Update .terraform.lock.hcl

The lock file must be regenerated for OpenTofu:

```bash
# Remove the old lock file
rm .terraform.lock.hcl

# Re-initialize to generate new lock file with OpenTofu signatures
tofu init

# Commit the new lock file
git add .terraform.lock.hcl
git commit -m "Regenerate lock file for OpenTofu"
```

## Step 6: Validate State After First tofu apply

```bash
# Apply a trivial change (e.g., add a tag) to test round-trip
tofu apply

# After apply, verify state is consistent
tofu plan  # Should show no changes again

# Check state version (pull from remote backend, then inspect)
tofu state pull | jq '.version'
# OpenTofu writes format version 4 - same as Terraform
```

## Rollback Plan

If you need to roll back to Terraform temporarily:

```bash
# OpenTofu-modified state is readable by Terraform (same format)
terraform init
terraform plan  # Should show no changes

# The state file format is identical - no conversion needed
```

## Migration Checklist

```hcl
[ ] Install OpenTofu
[ ] Test on non-production environment first
[ ] Run tofu init in the project directory
[ ] Run tofu plan - verify no unexpected changes
[ ] Delete and regenerate .terraform.lock.hcl
[ ] Update CI/CD to use tofu binary (see separate post)
[ ] Run tofu apply on a low-risk change
[ ] Verify tofu plan shows no changes after apply
[ ] Update documentation and runbooks
[ ] Remove terraform binary from CI after validation period
```

## Conclusion

Migrating Terraform state to OpenTofu requires no state file conversion - the formats are identical. The migration is: install `tofu`, run `tofu init`, verify `tofu plan` shows no changes, regenerate the lock file, and update CI/CD. Test in non-production first, maintain a rollback path to Terraform for the first few weeks, and migrate production after the non-production validation period.
