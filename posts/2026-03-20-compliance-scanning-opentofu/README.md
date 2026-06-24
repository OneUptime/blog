# How to Run Compliance Scanning on OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Compliance, Security Scanning, CIS Benchmark, HIPAA, SOC2, Infrastructure as Code

Description: Learn how to scan OpenTofu configurations against compliance frameworks like CIS Benchmarks, HIPAA, and SOC 2 using Checkov and custom OPA policies - ensuring infrastructure meets regulatory...

## Introduction

Compliance scanning automates the verification that infrastructure configurations meet regulatory and security framework requirements. Rather than relying on manual audits after deployment, scan OpenTofu configs against CIS-aligned checks and custom PCI DSS, HIPAA, or SOC 2 policies as part of every pull request.

## Checkov: Built-in Compliance Checks

Checkov scans OpenTofu source files through its `terraform` framework; select built-in checks by ID or severity:

```bash
# Install Checkov

pip install checkov

# Run specific compliance-related checks
checkov -d . --framework terraform \
  --check CKV_AWS_19,CKV_AWS_18,CKV_AWS_17,CKV_AWS_293,CKV_AWS_16

# Run all Terraform/OpenTofu checks
checkov -d . --framework terraform

# Run all built-in checks and export JSON results
checkov -d . -o json --output-file-path reports
```

## Common CIS AWS Benchmark Violations

```hcl
# CKV_AWS_19: Ensure all data stored in the S3 bucket is securely encrypted at rest
# FIX: Enable default encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# CKV_AWS_18: Ensure the S3 bucket has access logging enabled
resource "aws_s3_bucket_logging" "app" {
  bucket        = aws_s3_bucket.app.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "app-access-logs/"
}

# CKV_AWS_17: Ensure all data stored in RDS is not publicly accessible
resource "aws_db_instance" "postgres" {
  identifier          = "prod-postgres"
  publicly_accessible = false  # CIS requirement

  # CKV_AWS_293: Ensure that AWS database instances have deletion protection enabled
  deletion_protection = true

  # CKV_AWS_16: Ensure all data stored in the RDS is securely encrypted at rest
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn
}
```

## Custom OPA Compliance Policies

Write Rego policies for controls that Checkov doesn't cover out of the box:

```rego
# policies/pci_dss.rego
package main

import rego.v1

# PCI DSS Req 1.3: Prohibit direct public access to cardholder data environment
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    some action in resource.change.actions
    action in ["create", "update"]

    # DB must not be publicly accessible
    resource.change.after.publicly_accessible == true

    msg := sprintf(
        "PCI DSS VIOLATION: RDS instance '%s' must not be publicly accessible",
        [resource.address]
    )
}

# PCI DSS Req 8.2: Encrypt all stored cardholder data
deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    some action in resource.change.actions
    action in ["create", "update"]

    resource.change.after.storage_encrypted != true

    msg := sprintf(
        "PCI DSS VIOLATION: RDS instance '%s' must have storage_encrypted = true",
        [resource.address]
    )
}
```

## GitHub Actions: Compliance Gate

```yaml
name: Compliance Scan

on:
  pull_request:

jobs:
  compliance:
    permissions:
      contents: read
      security-events: write
      actions: read
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: OpenTofu Init & Plan
        run: |
          tofu init -input=false
          tofu plan -input=false -out=tfplan.binary
          tofu show -json tfplan.binary > tfplan.json
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Checkov Compliance Scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          check: CKV_AWS_19,CKV_AWS_18,CKV_AWS_17,CKV_AWS_293,CKV_AWS_16
          output_format: sarif
          output_file_path: checkov-results.sarif

      - name: Install Conftest
        run: |
          eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
          brew install conftest

      - name: OPA Custom Compliance Policies
        run: conftest test tfplan.json --policy policies/

      - name: Upload Checkov Results
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: checkov-results.sarif
```

## Compliance as Code: .checkov.yaml

```yaml
# .checkov.yaml - project-level Checkov configuration
framework:
  - terraform

check:
  - CKV_AWS_19
  - CKV_AWS_18
  - CKV_AWS_17
  - CKV_AWS_293
  - CKV_AWS_16

skip-check:
  # Public website bucket - intentionally public
  - CKV_AWS_20
  - CKV2_AWS_6

compact: true
output:
  - cli
  - sarif
output-file-path: console,checkov-results.sarif
```

## Generating Compliance Reports

```bash
# Generate a JSON compliance report for auditors
checkov -d . \
  -o json \
  --output-file-path reports \
  --soft-fail   # Don't exit non-zero (just report)

# Extract passing/failing check counts
jq '.summary | {passed: .passed, failed: .failed}' reports/results_json.json
# {"passed": 142, "failed": 3}
```

## Conclusion

Compliance scanning in OpenTofu shifts regulatory verification left - from post-deployment audits to pre-merge checks. Checkov's 1,000+ built-in controls cover many cloud security and compliance best practices, and custom OPA policies can fill gaps for organization-specific controls. Generate SARIF output for GitHub Security tab integration and JSON reports for auditors. With compliance gates in CI, every merged change is compliance-verified.
