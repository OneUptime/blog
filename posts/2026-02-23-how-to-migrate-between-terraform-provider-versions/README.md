# How to Migrate Between Terraform Provider Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Migration, Version Management, Infrastructure as Code

Description: Learn how to safely migrate between Terraform provider versions including handling breaking changes, deprecated resources, and state format updates.

---

Terraform providers are updated regularly with new features, bug fixes, and sometimes breaking changes. Migrating between provider versions, especially across major versions, requires careful planning to avoid disrupting your infrastructure. This guide covers strategies for upgrading providers safely, handling breaking changes, and testing before applying.

## Understanding Provider Versioning

Terraform providers follow semantic versioning (semver). Major versions may introduce breaking changes, minor versions add features, and patch versions fix bugs:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"  # Allows 4.x but not 5.x
    }
  }
}
```

Version constraints control which versions Terraform uses:

```hcl
# Exact version
version = "= 5.0.0"

# Minimum version
version = ">= 5.0.0"

# Range
version = ">= 4.0, < 6.0"

# Pessimistic constraint (allows patch updates)
version = "~> 5.0"    # Allows 5.0.x through 5.x.x
version = "~> 5.0.0"  # Allows 5.0.x only
```

## Step 1: Check the Upgrade Guide

Before upgrading, always read the provider's upgrade guide:

```bash
# Check the current provider version
terraform providers

# View available versions
terraform providers lock -help

# Check the changelog and upgrade guide on the registry
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
```

Major version upgrade guides document all breaking changes, deprecated features, and required configuration updates.

## Step 2: Update the Version Constraint

Update your provider version constraint incrementally:

```hcl
# Before: AWS provider 4.x
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# After: Update to AWS provider 5.x
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

Then initialize to download the new version:

```bash
# Update the provider
terraform init -upgrade

# Check which version was installed
terraform version
```

## Step 3: Handle Deprecated Resources

Major provider updates often rename or split resources. For example, the AWS provider v5 made significant changes:

```hcl
# AWS Provider 4.x
resource "aws_s3_bucket" "example" {
  bucket = "my-bucket"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
      }
    }
  }
}

# AWS Provider 5.x - S3 bucket attributes moved to separate resources
resource "aws_s3_bucket" "example" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_versioning" "example" {
  bucket = aws_s3_bucket.example.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.example.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

## Step 4: Handle State Changes

Some provider upgrades require state modifications. Use `terraform state replace-provider` when the provider source changes:

```bash
# Replace a provider in state
terraform state replace-provider \
  "registry.terraform.io/hashicorp/aws" \
  "registry.terraform.io/hashicorp/aws"
```

For resources that were renamed, use moved blocks:

```hcl
# Handle resource type changes
moved {
  from = aws_s3_bucket_object.file
  to   = aws_s3_object.file
}
```

## Step 5: Test with terraform plan

After updating, run plan to identify all changes:

```bash
# Run plan to see what would change
terraform plan -out=upgrade.tfplan 2>&1 | tee upgrade-plan.log

# Review the plan output carefully
# Look for:
# - Resources being replaced (dangerous)
# - Resources being updated in-place (usually safe)
# - New resources being created (may indicate resource splits)
```

## Incremental Upgrade Strategy

For major version jumps, upgrade incrementally:

```bash
# Example: Upgrading AWS provider from 3.x to 5.x
# Step 1: Upgrade 3.x to latest 3.x
version = "~> 3.76"
# Run: terraform init -upgrade && terraform plan

# Step 2: Upgrade to 4.0
version = "~> 4.0"
# Run: terraform init -upgrade && terraform plan
# Fix any breaking changes

# Step 3: Upgrade to latest 4.x
version = "~> 4.67"
# Run: terraform init -upgrade && terraform plan

# Step 4: Upgrade to 5.0
version = "~> 5.0"
# Run: terraform init -upgrade && terraform plan
# Fix any breaking changes
```

## Handling Multiple Providers

When your configuration uses multiple providers, upgrade them one at a time:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Upgrade this first
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"  # Then upgrade this
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"  # Then this
    }
  }
}
```

## Locking Provider Versions

Use the dependency lock file to ensure consistent versions across your team:

```bash
# Update the lock file for all platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64

# The lock file (.terraform.lock.hcl) should be committed to version control
```

## Rolling Back a Provider Upgrade

If the upgrade causes issues, roll back:

```bash
# Revert the version constraint in your configuration
# Then reinitialize
terraform init -upgrade

# If state was modified, restore from backup
# Check your backend for state history
```

For S3 backends with versioning:

```bash
# List state versions
aws s3api list-object-versions \
  --bucket terraform-state \
  --prefix path/to/terraform.tfstate

# Restore a previous version
aws s3api get-object \
  --bucket terraform-state \
  --key path/to/terraform.tfstate \
  --version-id "previous-version" \
  restored-state.json

# Push the restored state
terraform state push restored-state.json
```

## Automating Provider Upgrades

Use Dependabot or Renovate to automate provider version detection:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "terraform"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

This creates pull requests for provider updates that you can review and test before merging.

## Best Practices

Read the upgrade guide before every major version upgrade. Test upgrades in a non-production environment first. Upgrade one major version at a time rather than skipping versions. Use version constraints that allow patch updates but not major updates. Commit the `.terraform.lock.hcl` file to version control. Back up your state before upgrading. Run `terraform plan` after every upgrade to identify changes.

## Conclusion

Migrating between Terraform provider versions is a routine but important maintenance task. Major version upgrades require careful attention to breaking changes, deprecated resources, and state format updates. By following an incremental upgrade strategy, testing with `terraform plan`, and reading upgrade guides, you can safely update providers without disrupting your infrastructure. Automate version detection with tools like Dependabot to stay on top of updates.

For related guides, see [How to Handle Breaking Changes During Terraform Upgrades](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-during-terraform-upgrades/view) and [How to Use terraform state replace-provider for Provider Migration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-state-replace-provider-for-provider-migration/view).
