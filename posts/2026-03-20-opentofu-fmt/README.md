# How to Use tofu fmt to Format Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu fmt to automatically format OpenTofu configuration files to the canonical style.

## Introduction

`tofu fmt` formats OpenTofu configuration files to the canonical style defined by the language. It adjusts indentation, aligns `=` signs in argument blocks, and normalizes whitespace. Running it ensures consistent formatting across a team and removes formatting debates from code reviews.

## Basic Usage

```bash
# Format all .tf and .tfvars files in the current directory

tofu fmt

# Output: names of files that were changed
# main.tf
# variables.tf
```

## Format Recursively

```bash
# Format all files in all subdirectories
tofu fmt -recursive
```

## Check Formatting Without Modifying

```bash
# Exit with a non-zero code if any files are not formatted
tofu fmt -check

# In CI/CD: fail if formatting is needed
tofu fmt -check -recursive || {
  echo "Run 'tofu fmt -recursive' to fix formatting"
  exit 1
}
```

## Show Differences

```bash
# Show what would change without modifying files
tofu fmt -diff

# Output:
# main.tf
# --- old/main.tf
# +++ new/main.tf
# @@ -5,7 +5,7 @@
# -  bucket = "my-bucket"
# +  bucket      = "my-bucket"
```

## What fmt Changes

Before formatting:
```hcl
resource "aws_s3_bucket" "data" {
bucket = "acme-data"
  force_destroy=true
      tags = {Name="data"}
}
```

After `tofu fmt`:
```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "acme-data"
  force_destroy = true
  tags          = { Name = "data" }
}
```

Changes include:
- Two-space indentation
- Space around `=` operators
- Aligned `=` signs within argument blocks
- Consistent spacing in maps and lists

## Pre-Commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
tofu fmt -check -recursive
if [ $? -ne 0 ]; then
  echo "Run 'tofu fmt -recursive' to fix formatting before committing."
  exit 1
fi
```

Or auto-format on commit:

```bash
# .git/hooks/pre-commit
#!/bin/bash
tofu fmt -recursive
git add -u  # Re-stage formatted files
```

## CI/CD Enforcement

```yaml
# GitHub Actions: fail PR if formatting is wrong
- name: Check formatting
  run: |
    tofu fmt -check -recursive
    if [ $? -ne 0 ]; then
      echo "::error::Run 'tofu fmt -recursive' to fix formatting"
      exit 1
    fi
```

## Format Specific Files

```bash
# Format a single file
tofu fmt main.tf

# Format a specific directory
tofu fmt ./modules/networking/
```

## Formatting .tfvars Files

```bash
# fmt also formats .tfvars files
tofu fmt production.tfvars
```

## Editor Integration

Most editors support automatic formatting via the `tofu-ls` language server (the official OpenTofu language server), which uses the same formatting rules as `tofu fmt`. Configure your editor to format on save for a seamless experience.

## Conclusion

`tofu fmt` enforces a single canonical style across all OpenTofu files. Run it with `-recursive` before every commit, or enforce it in CI/CD with `-check -recursive`. The consistent formatting eliminates style debates and makes diffs easier to read - only meaningful changes appear in code reviews. Use pre-commit hooks to auto-format files so developers never have to think about formatting.
