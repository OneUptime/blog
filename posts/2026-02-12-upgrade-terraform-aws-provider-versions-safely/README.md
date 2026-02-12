# How to Upgrade Terraform AWS Provider Versions Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, DevOps, Infrastructure as Code

Description: A safe, step-by-step process for upgrading the Terraform AWS provider version, including compatibility checks, testing strategies, and rollback procedures.

---

The Terraform AWS provider gets updated frequently - new resources, bug fixes, deprecation removals, and sometimes breaking changes. Keeping it up to date is important for security patches and access to new AWS services. But upgrading carelessly can break your infrastructure or cause unexpected changes to your resources.

This post walks through a safe upgrade process that minimizes risk and gives you confidence that nothing will break.

## Understanding Provider Versioning

The AWS provider follows semantic versioning: `MAJOR.MINOR.PATCH`.

- **Patch** (5.30.0 to 5.30.1): Bug fixes. Safe to apply.
- **Minor** (5.30.0 to 5.31.0): New features, new resources. Usually safe but check the changelog.
- **Major** (4.x to 5.x): Breaking changes. Resources may behave differently. Requires careful planning.

Your version constraint in Terraform controls which upgrades are allowed:

```hcl
# Common version constraint patterns
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"     # Allows 5.x but not 6.x
    }
  }
}
```

Here are the different constraint operators and what they mean:

```hcl
# Exact version - strictest, no automatic updates
version = "5.30.0"

# Pessimistic constraint - allows minor and patch updates
version = "~> 5.30"    # Allows 5.30.x (patch updates only)
version = "~> 5.0"     # Allows 5.x.x (minor and patch updates)

# Range constraints
version = ">= 5.0, < 6.0"  # Same as ~> 5.0 but more explicit
```

For production, `~> 5.0` (or whatever your current major version is) is a good balance between staying current and avoiding breaking changes.

## Step 1: Check Your Current Version

Before upgrading, know where you stand:

```bash
# Check current provider version
terraform version

# Check the lock file for exact pinned version
cat .terraform.lock.hcl | grep -A 2 "provider.*hashicorp/aws"

# See all providers and their versions
terraform providers
```

## Step 2: Review the Changelog

This is the most important step and the one people skip. Go to the provider's GitHub releases page and read what changed between your current version and the target version.

Look specifically for:
- **Breaking changes** (any item tagged as "breaking" or in a major version release)
- **Deprecations** that affect resources you use
- **Bug fixes** that might change behavior you depend on
- **New required fields** on resources you manage

For the AWS provider, changes are documented at https://github.com/hashicorp/terraform-provider-aws/blob/main/CHANGELOG.md

## Step 3: Update the Version Constraint

Modify your provider version constraint:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"  # Updated from ~> 5.30
    }
  }
}
```

Then run init to download the new version:

```bash
# Download the new provider version
terraform init -upgrade
```

The `-upgrade` flag tells Terraform to update providers within the version constraints. Without it, Terraform uses whatever version is already cached.

## Step 4: Run Plan and Inspect

This is where you find out if anything breaks:

```bash
# Run a plan and save it for inspection
terraform plan -out=upgrade-plan.tfplan

# If you want more detail on what changed
terraform plan -out=upgrade-plan.tfplan 2>&1 | tee plan-output.txt
```

Read the plan carefully. You're looking for:

1. **Unexpected resource changes** - any resources showing as "changed" or "replaced" that you didn't expect
2. **Deprecation warnings** - the new provider might warn about resources or arguments that are being removed
3. **New required arguments** - some upgrades add required fields that you need to specify

If the plan shows zero changes, great - the upgrade is compatible with your current configuration. If it shows changes, investigate each one.

## Step 5: Test in Non-Production First

Never upgrade production first. Follow this order:

```
Development -> Staging -> Production
```

For each environment:

```bash
# 1. Switch to the environment
cd environments/dev

# 2. Update the provider version
# (edit the required_providers block)

# 3. Initialize and upgrade
terraform init -upgrade

# 4. Plan and review
terraform plan

# 5. Apply if the plan looks correct
terraform apply

# 6. Run your application tests to verify nothing broke
```

## Step 6: Handle Deprecations

Provider upgrades often deprecate old arguments in favor of new ones. The old arguments still work for a while but will be removed in a future major version.

For example, the AWS provider moved S3 bucket configuration from inline blocks to separate resources:

```hcl
# Old way (deprecated in provider 4.x)
resource "aws_s3_bucket" "example" {
  bucket = "my-bucket"

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

# New way (provider 4.x+)
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

Address deprecations proactively. They won't break now, but they'll become errors in the next major version.

## Step 7: Update the Lock File

After a successful upgrade, commit the updated lock file:

```bash
# The lock file was updated by terraform init -upgrade
git add .terraform.lock.hcl
git commit -m "Upgrade AWS provider to version 5.40.0"
```

The lock file (`.terraform.lock.hcl`) ensures every team member and CI pipeline uses the exact same provider version. Always commit it.

## Handling Major Version Upgrades

Major version upgrades (like 4.x to 5.x) deserve extra care. The provider's upgrade guide lists all breaking changes and migration steps.

General approach for major upgrades:

1. Read the entire upgrade guide
2. Create a branch for the upgrade
3. Update the version constraint
4. Run `terraform init -upgrade`
5. Run `terraform plan` and fix all errors
6. Address every deprecation warning
7. Test in dev, then staging
8. Get a thorough code review
9. Apply to production during a maintenance window

For the AWS provider 4.x to 5.x upgrade specifically, the biggest changes were around S3 bucket configuration (moved to separate resources) and the removal of many long-deprecated arguments.

## Rolling Back

If something goes wrong after applying the upgrade:

```bash
# Revert the version constraint and lock file
git checkout -- terraform.tf .terraform.lock.hcl

# Reinitialize with the old version
terraform init

# Run a plan to see what needs to change back
terraform plan
```

This is why testing in non-production first is so important. It's much easier to roll back a dev environment than production.

## Automating Version Checks

You can use tools like Dependabot or Renovate to automatically create PRs when new provider versions are available:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: terraform
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
```

This creates PRs automatically, and your CI pipeline can run `terraform plan` on them to check for issues before you merge.

## Wrapping Up

Provider upgrades are routine maintenance, but they deserve respect. Always read the changelog, always test in non-production first, and always commit the lock file. For minor and patch versions, the risk is low. For major versions, plan a proper migration with testing and a maintenance window. The worst thing you can do is let your provider version fall so far behind that upgrading becomes a massive project. Stay within a version or two of the latest, and each upgrade stays small and manageable.
