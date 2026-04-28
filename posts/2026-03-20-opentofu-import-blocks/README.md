# How to Use Import Blocks for Declarative Import in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Import

Description: Learn how to use import blocks in OpenTofu to declaratively import existing infrastructure resources through the normal plan and apply workflow.

## Introduction

Import blocks provide a declarative alternative to the `tofu import` CLI command. You define the import in configuration, and OpenTofu performs it as part of the normal plan/apply cycle. This approach gives you a preview of the import before committing it, works with version control and code review, and is reversible - remove the import block after the resource is imported.

## Basic Import Block

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
# Preview the import
tofu plan
# Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

# Perform the import
tofu apply
```

## How It Differs from CLI Import

```bash
# CLI import: modifies state immediately, no plan
tofu import aws_s3_bucket.existing my-existing-bucket

# Import block: goes through plan/apply, visible in PR, reviewable
# import block in .tf file → tofu plan → tofu apply
```

## Import Block Syntax

```hcl
import {
  to = <resource_address>   # Target resource in your configuration
  id = "<import_id>"        # Provider-specific import ID
}
```

## Import Multiple Resources

```hcl
# import.tf
import {
  to = aws_s3_bucket.data
  id = "acme-data-bucket"
}

import {
  to = aws_iam_role.app
  id = "my-application-role"
}

import {
  to = aws_vpc.main
  id = "vpc-0abc123456"
}
```

## Import into a Module

```hcl
import {
  to = module.networking.aws_vpc.main
  id = "vpc-0abc123456"
}
```

## After Import: Remove the Block

Once applied, the import block should be removed. The resource is now in state and managed by the configuration:

```bash
# After tofu apply completes the import:
# 1. Remove the import block from import.tf
# 2. Run tofu plan to verify no changes
# 3. Commit the clean configuration
```

## Plan Shows Import Intent

```bash
tofu plan

# Output:
# OpenTofu will perform the following actions:
#
#   # aws_s3_bucket.existing will be imported
#     resource "aws_s3_bucket" "existing" {
#         bucket = "my-existing-bucket"
#         id     = "my-existing-bucket"
#         # ...
#     }
#
# Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
```

The `# ... will be imported` comment line indicates the import operation, and the summary count includes "1 to import".

## Handling Attribute Mismatches

After importing, `tofu plan` may show in-place updates where the resource configuration doesn't match the actual settings:

```bash
tofu plan
# ~ aws_s3_bucket.existing will be updated in-place
#   ~ force_destroy = false -> true
```

Update your configuration to match the imported resource's actual settings, then re-plan until there are no changes.

## CI/CD Import Workflow

```yaml
# PR: Add import block + resource configuration
# Plan shows: "1 to import"
# Review and approve
# Merge: tofu apply performs import
# Follow-up PR: Remove import block
# Plan shows: "No changes"
```

## Conclusion

Import blocks are the recommended way to bring existing resources under OpenTofu management. They integrate with the plan/apply workflow, enabling code review and preview before execution. Write the resource configuration alongside the import block, apply it to import, then remove the block and commit the clean configuration. Use `tofu plan` to verify no changes remain after importing.
