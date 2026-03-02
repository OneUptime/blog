# How to Handle Breaking Changes During Terraform Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Upgrade, Breaking Changes, Migration, Infrastructure as Code

Description: Learn strategies for identifying, planning for, and resolving breaking changes when upgrading Terraform core, providers, and modules in your infrastructure.

---

Breaking changes are an inevitable part of software evolution, and Terraform is no exception. Whether upgrading Terraform core, providers, or modules, breaking changes can cause plan failures, unexpected resource modifications, or even resource destruction. This guide covers how to identify, plan for, and resolve breaking changes across all types of Terraform upgrades.

## Types of Breaking Changes

Breaking changes in the Terraform ecosystem come from three sources:

1. Terraform core upgrades that change language features or behavior
2. Provider upgrades that rename resources, change attribute types, or modify defaults
3. Module upgrades that change variables, outputs, or internal resource structures

Each type requires a different approach to resolve.

## Identifying Breaking Changes Before They Hit

### Read Upgrade Guides

Every major provider release includes an upgrade guide:

```bash
# AWS Provider upgrade guides:
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade

# Azure Provider upgrade guides:
# https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide

# GCP Provider upgrade guides:
# https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/version_5_upgrade
```

### Use terraform plan as a Safety Net

Always run plan before applying after any upgrade:

```bash
# After upgrading, run plan to detect issues
terraform init -upgrade
terraform plan -out=upgrade.tfplan 2>&1 | tee plan-output.log

# Search for destructive changes
grep -E "must be replaced|will be destroyed" plan-output.log
```

### Check Provider Changelogs

```bash
# View recent changes for a provider
# Check GitHub releases for the provider repository
```

## Handling Resource Renames

Providers sometimes rename resource types. This appears as a destroy-and-create in your plan:

```
# aws_s3_bucket_object.file will be destroyed
- resource "aws_s3_bucket_object" "file" { ... }

# aws_s3_object.file will be created
+ resource "aws_s3_object" "file" { ... }
```

Fix with moved blocks:

```hcl
# Use moved blocks to handle resource type changes
moved {
  from = aws_s3_bucket_object.file
  to   = aws_s3_object.file
}

# Update the resource block to use the new type
resource "aws_s3_object" "file" {
  bucket = aws_s3_bucket.data.id
  key    = "data/file.txt"
  source = "local/file.txt"
}
```

## Handling Attribute Changes

Provider upgrades may change attribute names, types, or default values:

```hcl
# Before: attribute was a string
resource "aws_instance" "web" {
  monitoring = "true"  # String in old provider
}

# After: attribute is now a boolean
resource "aws_instance" "web" {
  monitoring = true  # Boolean in new provider
}
```

For removed attributes:

```hcl
# Before: attribute existed
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
  acl    = "private"  # Removed in AWS provider 4.x

  versioning {
    enabled = true  # Moved to separate resource
  }
}

# After: split into separate resources
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_acl" "data" {
  bucket = aws_s3_bucket.data.id
  acl    = "private"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Handling Default Value Changes

When a provider changes default values, existing resources may show unexpected changes:

```
# aws_instance.web will be updated in-place
~ resource "aws_instance" "web" {
    ~ metadata_options {
        ~ http_tokens = "optional" -> "required"  # Default changed
      }
  }
```

Fix by explicitly setting the old default:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Explicitly set to maintain old behavior
  metadata_options {
    http_tokens = "optional"
  }
}
```

## Using lifecycle Blocks for Temporary Relief

When you need time to address breaking changes, lifecycle blocks provide temporary protection:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  # Temporarily ignore changes caused by the upgrade
  lifecycle {
    ignore_changes = [
      metadata_options,
    ]
  }
}
```

Remove these blocks after properly addressing the breaking changes.

## Handling State Schema Changes

Some provider upgrades change the state schema. Terraform usually handles this automatically, but you may see warnings:

```bash
# If state needs upgrading, Terraform does it automatically
terraform plan
# Warning: Resource instance managed by newer provider version

# In rare cases, you may need to refresh state
terraform refresh
```

## Creating a Breaking Change Resolution Plan

For large codebases, systematically address breaking changes:

```bash
#!/bin/bash
# analyze-breaking-changes.sh
# Identify all breaking changes from a provider upgrade

terraform init -upgrade
terraform plan -no-color 2>&1 | tee full-plan.log

echo "=== RESOURCE REPLACEMENTS ==="
grep -B5 "must be replaced" full-plan.log

echo ""
echo "=== RESOURCE DELETIONS ==="
grep -B5 "will be destroyed" full-plan.log

echo ""
echo "=== RESOURCE UPDATES ==="
grep -B5 "will be updated" full-plan.log

echo ""
echo "=== ERRORS ==="
grep -A3 "Error:" full-plan.log
```

## Rolling Back an Upgrade

If breaking changes are too severe, roll back:

```bash
# Revert the version constraint
# Edit terraform.tf to use the old version

# Reinitialize with the old version
terraform init -upgrade

# Verify state is still valid
terraform plan
```

For state that was modified by the upgrade:

```bash
# Restore state from backup
terraform state push state-backup.json

# Or restore from versioned backend
aws s3api get-object \
  --bucket terraform-state \
  --key terraform.tfstate \
  --version-id "pre-upgrade-version-id" \
  restored-state.json

terraform state push restored-state.json
```

## Gradual Adoption Strategy

For large teams, adopt breaking changes gradually:

```hcl
# Use provider aliases to run old and new versions side by side
provider "aws" {
  alias   = "new"
  region  = "us-east-1"
  version = "~> 5.0"
}

# Migrate resources one at a time to the new provider
resource "aws_s3_object" "new_resource" {
  provider = aws.new
  # ...
}
```

## Automated Testing for Upgrades

Use CI/CD pipelines to catch breaking changes early:

```yaml
# .github/workflows/terraform-upgrade-test.yml
name: Test Terraform Upgrade
on:
  pull_request:
    paths:
      - '**/*.tf'
      - '.terraform.lock.hcl'

jobs:
  test-upgrade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9"
      - run: terraform init
      - run: terraform validate
      - run: terraform plan -detailed-exitcode
```

## Best Practices

Always read upgrade guides before major version upgrades. Use `terraform plan` as your first line of defense against breaking changes. Address resource renames with moved blocks to avoid destroy-and-create cycles. Set explicit values for attributes whose defaults change to maintain current behavior. Test upgrades in non-production environments. Keep the `.terraform.lock.hcl` file committed so all team members use the same versions. Document resolved breaking changes for team knowledge sharing.

## Conclusion

Breaking changes during Terraform upgrades are manageable with the right approach. The combination of upgrade guides, `terraform plan`, moved blocks, and explicit attribute settings handles most scenarios. Always test upgrades before applying to production, and have a rollback plan ready. By treating upgrades as a planned activity rather than an emergency, you can adopt new versions confidently and benefit from their improvements.

For related guides, see [How to Migrate Between Terraform Provider Versions](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-between-terraform-provider-versions/view) and [How to Migrate Terraform Modules to New Versions](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-terraform-modules-to-new-versions/view).
