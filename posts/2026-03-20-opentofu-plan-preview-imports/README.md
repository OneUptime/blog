# How to Plan and Preview Imports Before Applying in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Import

Description: Learn how to use tofu plan to preview import operations before applying them, ensuring your configuration matches the existing resource.

## Introduction

One of the main advantages of import blocks over the CLI `tofu import` command is that import blocks integrate with the plan/apply workflow. You can run `tofu plan` to preview the import, see what attributes differ between your configuration and the actual resource, and fix mismatches before committing the import to state.

## Preview an Import with tofu plan

```hcl
# import.tf

import {
  to = aws_s3_bucket.existing
  id = "my-existing-bucket"
}

resource "aws_s3_bucket" "existing" {
  bucket = "my-existing-bucket"
}
```

```bash
tofu plan

# Output shows the import will happen:
# # aws_s3_bucket.existing will be imported
# ~ resource "aws_s3_bucket" "existing" {
#     + arn                         = "arn:aws:s3:::my-existing-bucket"
#     + bucket                      = "my-existing-bucket"
#     + bucket_domain_name          = "my-existing-bucket.s3.amazonaws.com"
#       ...
#   }
#
# Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
```

## Detecting Configuration Mismatches Before Apply

```bash
# If your configuration doesn't match the real resource:
tofu plan

# Plan shows: import + in-place update
# # aws_s3_bucket.existing will be imported
# # aws_s3_bucket.existing will be updated in-place
# ~ resource "aws_s3_bucket" "existing" {
#   ~ force_destroy = false -> true   ← your config differs
# }
#
# Plan: 1 to import, 0 to add, 1 to change, 0 to destroy.
```

Fix your configuration before applying to avoid unintended changes to the existing resource.

## Generate Configuration to See All Attributes

```bash
# Generate configuration from the actual resource
tofu plan -generate-config-out=generated.tf

# generated.tf shows the real resource's current state
# Use it to make your configuration accurate
```

## The Reconciliation Loop

```bash
# 1. Write import block
# 2. Run plan
tofu plan

# 3. See what differs between your config and real resource
# 4. Update your configuration to match

# 5. Re-run plan - repeat until:
tofu plan
# Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

# 6. Apply - clean import with no modifications
tofu apply
```

## Save Import Plan for Review

```bash
# Save the import plan for review
tofu plan -out=import.tfplan

# Review what will be imported
tofu show import.tfplan

# Apply exactly the reviewed import
tofu apply import.tfplan
```

## JSON Plan Analysis of Imports

```bash
tofu plan -out=import.tfplan
tofu show -json import.tfplan | jq '
  .resource_changes[] |
  select(.change.importing != null) |
  {address, import_id: .change.importing.id, actions: .change.actions, before: .change.before, after: .change.after}
'
```

## Verify No Unintended Changes

```bash
# The ideal import plan shows ONLY imports, no changes
tofu plan

# Good:
# Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

# Needs attention:
# Plan: 1 to import, 0 to add, 1 to change, 0 to destroy.
# ↑ The change will modify the existing resource after import
```

## What a Clean Import Looks Like After Apply

```bash
tofu apply

# Output:
# aws_s3_bucket.existing: Importing from ID "my-existing-bucket"...
# aws_s3_bucket.existing: Import complete! [id=my-existing-bucket]

# Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.
```

```bash
# Remove import block, run final plan to confirm clean state
tofu plan
# No changes. Your infrastructure matches the configuration.
```

## Conclusion

Always preview imports with `tofu plan` before applying. The plan shows what attributes will be imported and flags any configuration mismatches that would trigger changes to the existing resource. Use `-generate-config-out` to see the resource's actual attributes, adjust your configuration to match, and iterate until the plan shows only the import with zero changes. This ensures the import is non-disruptive to the existing resource.
