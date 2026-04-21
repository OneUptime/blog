# How to Test OpenTofu Configurations with Trivy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Trivy, Security Scanning, Vulnerability, Compliance

Description: Learn how to use Trivy to scan OpenTofu configurations for security misconfigurations and compliance issues, with support for CIS benchmarks and custom policies.

## Introduction

Trivy is a comprehensive security scanner from Aqua Security that scans container images, filesystems, and infrastructure-as-code including OpenTofu/Terraform configurations. It checks for security misconfigurations against built-in policies and supports custom Rego policies for organization-specific rules.

## Installation and Basic Scanning

```bash
# Install Trivy

brew install trivy  # macOS
# or
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin v0.70.0

# Scan current directory
trivy config .

# Scan with severity filter
trivy config --severity HIGH,CRITICAL .

# Scan a specific file
trivy config main.tf

# Output as JSON
trivy config -f json -o trivy-results.json .

# Output as SARIF (for GitHub Security tab)
trivy config -f sarif -o trivy-results.sarif .
```

## Understanding Output

```bash
# Example output:
# main.tf (terraform)
# ==================
# Tests: 20 (SUCCESSES: 18, FAILURES: 2)
# Failures: 2 (HIGH: 1, CRITICAL: 1)
#
# HIGH: Security groups should not allow unrestricted ingress to SSH or RDP from any IP address.
# ════════════════════════════════════════════
# Security groups provide stateful filtering of ingress and egress network traffic.
# See https://avd.aquasec.com/misconfig/aws-0107
# main.tf:15-25
```

## Common OpenTofu Issues Trivy Catches

```hcl
# Trivy check: AWS-0090 - S3 bucket without versioning
# FIX:
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Trivy check: AWS-0107 - Security group allows unrestricted SSH
# FIX: Restrict SSH to specific CIDRs
resource "aws_security_group_rule" "ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["10.0.0.0/8"]  # Internal only
  # NOT: cidr_blocks = ["0.0.0.0/0"]
  security_group_id = aws_security_group.main.id
}

# Trivy check: AWS-0177 - RDS without deletion protection
# FIX:
resource "aws_db_instance" "main" {
  # ...
  deletion_protection = true
}
```

## Custom Rego Policies

```rego
# policies/require_tags.rego
# METADATA
# title: Required AWS resource tags
# description: Ensure required tags are set on selected AWS resources.
# scope: package
# schemas:
#   - input: schema["terraform-raw"]
# custom:
#   id: USR-TFRAW-0001
#   severity: MEDIUM
#   short_code: required-aws-tags
#   recommended_actions: Add the required tags to AWS resources.
#   input:
#     selector:
#     - type: terraform-raw
package user.terraform.required_aws_tags

import rego.v1

required_tags_by_type := {
    "aws_instance": {"Environment"},
    "aws_s3_bucket": {"Owner"},
}

resources_to_check := {block |
    some module in input.modules
    some block in module.blocks
    block.kind == "resource"
    required_tags_by_type[block.type]
}

deny contains res if {
    some block in resources_to_check
    not block.attributes.tags
    required_tags := required_tags_by_type[block.type]
    res := result.new(
        sprintf("%s must define required tags: %v", [block.type, required_tags]),
        block,
    )
}

deny contains res if {
    some block in resources_to_check
    tags_attr := block.attributes.tags
    tags := object.keys(tags_attr.value)
    required_tags := required_tags_by_type[block.type]
    missing_tags := required_tags - tags
    count(missing_tags) > 0
    res := result.new(
        sprintf("%s is missing required tags: %v", [block.type, missing_tags]),
        tags_attr,
    )
}
```

```bash
# Use a custom policy with raw Terraform/OpenTofu input
trivy config \
  --config-check policies/require_tags.rego \
  --check-namespaces user \
  --misconfig-scanners terraform \
  --raw-config-scanners terraform .
```

## Trivy Configuration File

```yaml
# .trivyignore.yaml - ignore specific misconfiguration checks
misconfigurations:
  - id: AWS-0090  # S3 versioning - not required for this dev bucket
    statement: "Versioning not required for dev environment"
    paths:
      - "environments/dev/main.tf"
```

```bash
# Use the YAML ignore file
trivy config --ignorefile ./.trivyignore.yaml .

# Or use inline suppression comment in .tf files
# trivy:ignore:AWS-0090
resource "aws_s3_bucket" "logs" {
  bucket = "log-bucket"
  # Versioning not needed for access logs
}
```

## CIS Benchmark Scanning

```bash
# Run against CIS AWS Foundations Benchmark
trivy config --compliance aws-cis-1.2 .

# Run against a newer CIS AWS Foundations Benchmark
trivy config --compliance aws-cis-1.4 .
```

## CI/CD Integration

```yaml
# .github/workflows/trivy-scan.yml
name: Trivy Security Scan

on: [pull_request]

jobs:
  trivy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@0.35.0
        with:
          scan-type: config
          scan-ref: .
          format: sarif
          output: trivy-results.sarif
          severity: HIGH,CRITICAL
          exit-code: '1'

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: trivy-results.sarif
```

## Comparing Trivy vs Checkov

| Feature | Trivy | Checkov |
|---------|-------|---------|
| IaC scanning | Yes | Yes |
| Container scanning | Yes | Yes |
| Custom policies | Rego | Python/YAML |
| CIS Benchmarks | Yes | Yes |
| Speed | Fast | Fast |
| Output formats | JSON, SARIF, table | JSON, SARIF, JUnit |

## Conclusion

Trivy is particularly valuable when you want a single security scanner across both container images and infrastructure code - the same tool that scans your Docker images can scan your OpenTofu configurations. Use the SARIF output for GitHub Security tab integration, and apply `.trivyignore.yaml` for false positives with documented reasons rather than silently ignoring findings.
