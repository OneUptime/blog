# How to Use Checkov for Terraform Security Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Security, DevOps, Checkov

Description: Learn how to integrate Checkov into your Terraform workflow to catch security misconfigurations and compliance violations before deployment.

---

Writing Terraform that works is one thing. Writing Terraform that's actually secure is another. It's easy to forget an encryption setting, leave a security group wide open, or skip enabling logging on a critical resource. Checkov catches those mistakes before they make it to production.

Checkov is an open-source static analysis tool that scans Terraform code (and other IaC formats) against hundreds of security and compliance policies. It runs fast, integrates into CI/CD pipelines, and has solid coverage for AWS resources.

## Installing Checkov

Checkov is a Python package. Install it with pip:

```bash
# Install Checkov
pip install checkov

# Verify the installation
checkov --version
```

If you prefer Docker:

```bash
# Run Checkov using Docker
docker run --rm -v $(pwd):/tf bridgecrew/checkov -d /tf
```

## Running Your First Scan

Point Checkov at a directory containing Terraform files:

```bash
# Scan the current directory
checkov -d .

# Scan a specific directory
checkov -d ./terraform/modules/vpc
```

The output shows each check, whether it passed or failed, and guidance on fixing failures.

Here's an example of what Checkov flags on a typical Terraform config:

```hcl
# This S3 bucket will trigger multiple Checkov findings
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}
```

Running Checkov against this gives you findings like:

```
FAILED: CKV_AWS_18 - Ensure the S3 bucket has access logging enabled
FAILED: CKV_AWS_19 - Ensure the S3 bucket has server-side encryption
FAILED: CKV_AWS_21 - Ensure the S3 bucket has versioning enabled
FAILED: CKV2_AWS_6 - Ensure that S3 bucket has a Public Access Block
```

## Fixing Common Findings

Let's fix the S3 bucket findings. Each fix maps to a specific Terraform configuration:

```hcl
# S3 bucket with all security checks passing
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

# Enable versioning
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable access logging
resource "aws_s3_bucket_logging" "data" {
  bucket = aws_s3_bucket.data.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "data-bucket-logs/"
}
```

## Scanning Terraform Plans

Checkov can scan plan files too, which catches issues that only appear after variable interpolation and module expansion:

```bash
# Generate a plan file
terraform plan -out=tfplan

# Convert to JSON
terraform show -json tfplan > tfplan.json

# Scan the plan
checkov -f tfplan.json
```

This is particularly useful because some checks only work against plan output. For example, checks on dynamic values that aren't known until plan time.

## Integrating with CI/CD

Here's a GitHub Actions workflow that runs Checkov on every pull request:

```yaml
# .github/workflows/checkov.yml
name: Checkov Security Scan

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: results.sarif
          soft_fail: false  # Fail the build on findings

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

The SARIF upload puts findings directly in the GitHub Security tab for easy tracking.

## Custom Policies

Checkov's built-in checks cover the basics, but you'll likely need custom policies for your organization's requirements. Write them in Python or YAML.

Here's a YAML-based custom policy:

```yaml
# custom_policies/require_tags.yaml
metadata:
  id: "CUSTOM_AWS_1"
  name: "Ensure all resources have required tags"
  severity: "MEDIUM"
  category: "General"

definition:
  cond_type: "attribute"
  resource_types:
    - "aws_instance"
    - "aws_s3_bucket"
    - "aws_rds_cluster"
  attribute: "tags.Environment"
  operator: "exists"
```

A Python-based custom check gives you more flexibility:

```python
# custom_policies/check_instance_type.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RestrictInstanceTypes(BaseResourceCheck):
    def __init__(self):
        name = "Ensure EC2 instances use approved instance types"
        id = "CUSTOM_AWS_2"
        supported_resources = ["aws_instance"]
        categories = [CheckCategories.GENERAL_SECURITY]
        super().__init__(name=name, id=id,
                        categories=categories,
                        supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        # Only allow t3 and m5 instance families
        allowed_prefixes = ["t3.", "m5.", "m6i.", "c6i."]
        instance_type = conf.get("instance_type", [""])[0]

        for prefix in allowed_prefixes:
            if instance_type.startswith(prefix):
                return CheckResult.PASSED

        return CheckResult.FAILED

check = RestrictInstanceTypes()
```

Run Checkov with your custom policies:

```bash
# Include custom policies from a directory
checkov -d ./terraform --external-checks-dir ./custom_policies
```

## Suppressing False Positives

Sometimes a finding doesn't apply. Maybe you legitimately need a public S3 bucket for a static website. Use inline suppressions:

```hcl
resource "aws_s3_bucket" "website" {
  bucket = "my-website-bucket"

  #checkov:skip=CKV2_AWS_6:Public access required for static website hosting
}
```

Or skip checks globally:

```bash
# Skip specific checks
checkov -d . --skip-check CKV_AWS_18,CKV_AWS_19

# Use a config file for consistent skip lists
checkov -d . --config-file .checkov.yml
```

The config file approach keeps things organized:

```yaml
# .checkov.yml
compact: true
directory:
  - terraform/
skip-check:
  - CKV_AWS_18  # Logging handled by CloudTrail
framework:
  - terraform
```

## Checkov with Terraform Modules

When scanning modules, Checkov evaluates the module source. For local modules, it resolves them automatically:

```bash
# Scan including module sources
checkov -d . --download-external-modules true
```

For private module registries, you'll need to provide credentials:

```bash
# Set Terraform registry token
export TF_REGISTRY_TOKEN="your-token"
checkov -d . --download-external-modules true
```

## Compliance Frameworks

Checkov maps checks to compliance frameworks like CIS, SOC2, HIPAA, and PCI-DSS. Run a scan filtered to a specific framework:

```bash
# Run only CIS benchmark checks
checkov -d . --check-type CIS

# Run PCI-DSS checks
checkov -d . --framework terraform --check-type PCI
```

This is helpful when you need to demonstrate compliance for audits.

## Pre-commit Hook

Catching issues before they even reach a PR is even better. Add Checkov as a pre-commit hook:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/bridgecrewio/checkov
    rev: '3.0.0'
    hooks:
      - id: checkov
        args: ['--directory', 'terraform/']
```

For more Terraform code quality checks, take a look at [using TFLint for Terraform linting](https://oneuptime.com/blog/post/2026-02-12-tflint-terraform-linting/view).

## Summary

Checkov is one of those tools that pays for itself immediately. A single misconfigured security group or unencrypted bucket it catches is worth the five minutes it takes to set up. Start with the built-in checks, add custom policies as your security requirements evolve, and integrate it into your CI pipeline so nothing slips through.

The combination of Checkov for security scanning, TFLint for code quality, and automated plan checks gives you a solid Terraform code review pipeline that catches issues at every level.
