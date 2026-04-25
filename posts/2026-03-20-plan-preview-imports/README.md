# How to Plan and Preview Imports Before Applying in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to preview import operations before applying them in OpenTofu, understanding what will be imported and identifying configuration mismatches.

## Introduction

Before executing an import operation, you should preview what will happen using `tofu plan`. The plan output for imports shows you what will be imported, highlights configuration mismatches, and lets you review before committing the change to state.

## Plan Output for Imports

When import blocks are present, `tofu plan` shows them distinctly:

```bash
tofu plan

# Output:

# OpenTofu will perform the following actions:
#
#   # aws_vpc.main will be imported
#     resource "aws_vpc" "main" {
#       id = "vpc-0a1b2c3d4e5f6789"
#     }
#
#   # aws_instance.web will be imported
#     resource "aws_instance" "web" {
#       id = "i-0123456789abcdef0"
#     }
#
# Plan: 2 to import, 0 to add, 0 to change, 0 to destroy.
```

## Understanding Import Plan Details

The plan shows different details based on the import state:

```bash
tofu plan

# Import with configuration match (ideal):
# aws_vpc.main will be imported
#   (No changes needed)

# Import with configuration drift:
# aws_vpc.main will be imported, then updated in-place
#   ~ enable_dns_hostnames = false -> true
```

When the plan shows "updated in-place" after import, it means your HCL configuration doesn't match the actual resource. If your goal is a zero-change import, fix the configuration to match reality before applying.

## Saving an Import Plan

```bash
# Save the import plan
tofu plan -out=import.tfplan

# Review the saved plan
tofu show -plan=import.tfplan

# Apply exactly what was planned
tofu apply import.tfplan
```

## Using -generate-config-out for Preview

Generate configuration for import targets that do not already exist in your configuration. The generated file is a starting point, and `preview.tf` must be a new file:

```bash
# Preview what config would be generated for missing resource blocks
tofu plan -generate-config-out=preview.tf

# Review the generated config before applying
cat preview.tf

# If satisfied, proceed with apply
tofu apply
```

## Detecting Configuration Mismatches

Common mismatches to look for in the plan:

```bash
tofu plan

# Mismatch: tags differ
# ~ tags = {
#   - "OldTag" = "value"     (needs to be removed from config or added to tags)
#   + "NewTag" = "value"     (needs to be added to config or ignored)
# }

# Mismatch: attribute differs
# ~ instance_type = "t3.micro" -> "t3.small"
# (your HCL says t3.micro, actual is t3.small)
```

Fix mismatches before applying:

```hcl
# Fix 1: Update HCL to match actual
resource "aws_instance" "web" {
  instance_type = "t3.small"  # Corrected to match actual
}

# Fix 2: Use lifecycle.ignore_changes for attributes you don't manage
resource "aws_instance" "web" {
  lifecycle {
    ignore_changes = [tags["LastModified"]]
  }
}
```

## Zero-Change Import Verification

The goal is to have the plan show no changes after import:

```bash
# Perfect import plan:
# Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

# After applying, verify:
tofu plan
# No changes. Infrastructure is up-to-date.
```

## Conclusion

Previewing imports with `tofu plan` before applying is essential for understanding what will be imported and catching configuration mismatches early. Save import plans with `-out` for reproducible, reviewable deployments. For a zero-change import, the goal is for `tofu plan` to show no changes after the import is applied - your configuration should accurately describe the existing resource.
