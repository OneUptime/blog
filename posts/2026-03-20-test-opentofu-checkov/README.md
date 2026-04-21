# How to Test OpenTofu Configurations with Checkov

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Checkov, Security Scanning, Policy, Compliance

Description: Learn how to use Checkov to scan OpenTofu configurations for security misconfigurations, compliance violations, and policy enforcement before deploying infrastructure.

## Introduction

Checkov is a static code analysis tool for infrastructure-as-code that checks OpenTofu configurations for security and compliance issues. It has hundreds of built-in policies covering AWS, Azure, GCP, and Kubernetes, and supports custom policies in Python or YAML.

## Installation and Basic Usage

```bash
# Install Checkov

pip install checkov

# Scan a directory
checkov -d .

# Scan a specific file
checkov -f main.tf

# Scan and output results as JSON
checkov -d . -o json > checkov-results.json

# Scan with specific frameworks
checkov -d . --framework terraform
```

## Understanding Output

```bash
# Example output:
# Check: CKV_AWS_20: "S3 Bucket has an ACL defined which allows public READ access."
#   PASSED for resource: aws_s3_bucket.example
#
# Check: CKV_AWS_18: "Ensure the S3 bucket has access logging enabled"
#   FAILED for resource: aws_s3_bucket.example
#   File: /path/to/main.tf:5-15
```

## Fixing Common Findings

```hcl
# BEFORE - fails CKV_AWS_18 (no S3 access logging)
resource "aws_s3_bucket" "app_assets" {
  bucket = "my-app-assets"
}

# AFTER - passes
resource "aws_s3_bucket" "app_assets" {
  bucket = "my-app-assets"
}

resource "aws_s3_bucket_logging" "app_assets" {
  bucket        = aws_s3_bucket.app_assets.id
  target_bucket = "my-app-access-logs"
  target_prefix = "s3-access-logs/"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

## Suppressing False Positives

```hcl
resource "aws_security_group" "public_lb" {
  name = "public-lb-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    # checkov:skip=CKV_AWS_260:ALB must accept public HTTP traffic for HTTPS redirect
  }
}
```

## Custom Checkov Policy (YAML)

```yaml
# policies/require_environment_tag.yaml
metadata:
  name: "Require Environment Tag"
  id: "CKV2_CUSTOM_1"
  category: "GENERAL_SECURITY"
  severity: "MEDIUM"

definition:
  and:
    - cond_type: attribute
      resource_types:
        - aws_instance
        - aws_s3_bucket
        - aws_db_instance
      attribute: tags.Environment
      operator: exists
```

## Custom Policy in Python

```python
# policies/check_encrypted_ebs.py
# Create an empty policies/__init__.py when loading Python checks from this directory.
from checkov.common.models.enums import CheckCategories, CheckResult
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class CheckEBSEncryption(BaseResourceCheck):
    def __init__(self):
        name = "Ensure EBS volumes are encrypted"
        id = "CKV_CUSTOM_2"
        categories = [CheckCategories.ENCRYPTION]
        supported_resources = ["aws_ebs_volume"]
        super().__init__(name=name, id=id, categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        encrypted = conf.get("encrypted", [False])
        if isinstance(encrypted, list):
            encrypted = encrypted[0]
        return CheckResult.PASSED if encrypted else CheckResult.FAILED

check = CheckEBSEncryption()
```

## Checkov Configuration File

```yaml
# .checkov.yaml
soft-fail: false
check:
  - CKV_AWS_20   # S3 public READ ACL
  - CKV_AWS_18   # S3 access logging
  - CKV_AWS_21   # S3 versioning
skip-check:
  - CKV_AWS_144  # S3 cross-region replication (not required)
directory:
  - .
framework:
  - terraform
external-checks-dir:
  - ./policies
output:
  - cli
  - sarif
output-file-path: console,checkov-results.sarif
```

## CI/CD Integration

```yaml
# .github/workflows/checkov.yml
name: Security Scan

on: [pull_request]

jobs:
  checkov:
    permissions:
      contents: read
      security-events: write
      actions: read
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          output_format: sarif
          output_file_path: reports/checkov.sarif
          soft_fail: false

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: reports/checkov.sarif
```

## Conclusion

Checkov provides immediate security feedback on OpenTofu configurations without requiring cloud credentials. Integrate it as a pre-commit hook for instant developer feedback and as a required CI check to block deployments with critical security findings. Use the YAML or Python custom policy formats to encode organization-specific compliance requirements. The SARIF output integrates with GitHub Security tab for visibility into findings over time.
