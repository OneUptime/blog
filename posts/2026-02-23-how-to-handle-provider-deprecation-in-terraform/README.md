# How to Handle Provider Deprecation in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Deprecation, Migration, Infrastructure as Code

Description: Learn how to identify and handle deprecated Terraform providers, resources, and attributes before they are removed in future provider versions.

---

Terraform providers regularly deprecate resources, attributes, and sometimes entire provider versions. Ignoring deprecation warnings leads to broken configurations when the deprecated features are eventually removed. This guide covers how to identify deprecations, plan for transitions, and update your configurations proactively.

## Understanding Deprecation in Terraform

Deprecation is a staged process. First, a feature is marked as deprecated with a warning. Then, in a future major version, it is removed. Terraform and its providers signal deprecation through plan warnings, validation messages, and changelog entries.

```bash
# Example deprecation warning during plan
Warning: Argument is deprecated

  with aws_s3_bucket.data,
  on main.tf line 5, in resource "aws_s3_bucket" "data":

The acl argument is deprecated. Use the aws_s3_bucket_acl resource instead.
```

## Identifying Deprecated Features

### Check Plan Output for Warnings

```bash
# Run plan and look for deprecation warnings
terraform plan 2>&1 | grep -A2 "deprecated"
```

### Check Validation Output

```bash
# Validate configuration for issues
terraform validate
```

### Review Provider Changelogs

Provider changelogs list deprecated features. Check the changelog for your provider version:

```bash
# Common changelog locations
# AWS: https://github.com/hashicorp/terraform-provider-aws/blob/main/CHANGELOG.md
# Azure: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/CHANGELOG.md
# GCP: https://github.com/hashicorp/terraform-provider-google/blob/main/CHANGELOG.md
```

## Types of Deprecation

### Deprecated Resources

When a resource type is deprecated, a new resource type replaces it:

```hcl
# Deprecated resource
resource "aws_s3_bucket_object" "file" {
  bucket = "my-bucket"
  key    = "data/file.txt"
  source = "local/file.txt"
}

# Replacement resource
resource "aws_s3_object" "file" {
  bucket = "my-bucket"
  key    = "data/file.txt"
  source = "local/file.txt"
}
```

To migrate, use a moved block:

```hcl
moved {
  from = aws_s3_bucket_object.file
  to   = aws_s3_object.file
}
```

### Deprecated Attributes

When an attribute is deprecated, it is usually moved to a separate resource or replaced by a new attribute:

```hcl
# Deprecated: inline attributes on S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"

  # These are deprecated
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

# Replacement: separate resources
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

### Deprecated Provider Versions

When a provider version reaches end of life:

```hcl
# Old version that may lose support
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"  # No longer receiving updates
    }
  }
}

# Updated to supported version
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Current supported version
    }
  }
}
```

## Creating a Deprecation Remediation Plan

Systematically address deprecations:

```bash
#!/bin/bash
# find-deprecations.sh
# Scan for deprecated features in your Terraform configuration

echo "=== Scanning for Deprecation Warnings ==="

# Initialize and validate
terraform init -upgrade > /dev/null 2>&1

# Capture plan output including warnings
PLAN_OUTPUT=$(terraform plan -no-color 2>&1)

# Extract deprecation warnings
echo "$PLAN_OUTPUT" | grep -B1 -A3 "deprecated" | while read -r line; do
  echo "$line"
done

# Count deprecation warnings
DEPRECATED_COUNT=$(echo "$PLAN_OUTPUT" | grep -c "deprecated" || true)
echo ""
echo "Found $DEPRECATED_COUNT deprecation warnings"
```

## Handling Deprecated Data Sources

Data sources can also be deprecated:

```hcl
# Deprecated data source
data "aws_iam_policy_document" "old_style" {
  # May use deprecated syntax
}

# Updated data source usage
data "aws_iam_policy_document" "current" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::my-bucket/*"]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}
```

## Handling Deprecated Functions

Some built-in functions may be deprecated or changed:

```hcl
# Deprecated function usage
locals {
  # list() function was deprecated in Terraform 0.12
  my_list = list("a", "b", "c")  # Deprecated

  # Use native list syntax instead
  my_list_new = ["a", "b", "c"]  # Current
}
```

## Automating Deprecation Detection in CI/CD

Add deprecation checks to your CI/CD pipeline:

```yaml
# .github/workflows/deprecation-check.yml
name: Check Terraform Deprecations
on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  check-deprecations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Initialize Terraform
        run: terraform init

      - name: Check for deprecations
        run: |
          terraform plan -no-color 2>&1 | tee plan-output.txt
          if grep -q "deprecated" plan-output.txt; then
            echo "::warning::Deprecation warnings found!"
            grep -A3 "deprecated" plan-output.txt
          fi
```

## Timeline for Addressing Deprecations

Create a timeline for each deprecation:

```text
Priority 1 (Immediate): Features removed in the next major version
  - Check the upcoming release notes for removals
  - Address before upgrading

Priority 2 (Next quarter): Features deprecated with a removal timeline
  - Plan migration work in upcoming sprints
  - Test alternatives in development

Priority 3 (Monitor): Recently deprecated features
  - Note in documentation
  - Address during routine maintenance
```

## Best Practices

Monitor deprecation warnings in your CI/CD pipeline output. Address deprecations proactively before they become removals. Test deprecated feature replacements in non-production environments. Use moved blocks to handle resource type changes without state disruption. Keep provider versions reasonably current to reduce the deprecation backlog. Document deprecation migration plans for your team. Subscribe to provider release notifications to stay informed about new deprecations.

## Conclusion

Provider deprecation is a normal part of the Terraform ecosystem. By proactively monitoring deprecation warnings, creating remediation plans, and testing replacements before they become mandatory, you can avoid disruptions when deprecated features are removed. Treat deprecation warnings as technical debt that should be addressed on a regular schedule rather than ignored until they cause failures.

For related guides, see [How to Migrate Between Terraform Provider Versions](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-between-terraform-provider-versions/view) and [How to Handle Breaking Changes During Terraform Upgrades](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-during-terraform-upgrades/view).
