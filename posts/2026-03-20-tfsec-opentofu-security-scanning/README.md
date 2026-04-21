# How to Use tfsec with OpenTofu for Security Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tfsec, Security Scanning, SAST, Compliance

Description: Learn how to use tfsec to scan OpenTofu configurations for security misconfigurations, with custom checks and CI/CD integration for continuous security validation.

## Introduction

tfsec is a static security analysis tool for Terraform configurations, and it can scan OpenTofu-compatible `.tf` configuration files as HCL. It scans for common security misconfigurations across AWS, Azure, GCP, and Kubernetes resources, providing fast feedback without cloud credentials. Note: tfsec has been absorbed into Trivy but remains available as a standalone tool.

## Installation

```bash
# macOS

brew install tfsec

# Linux
curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash

# Or via Go
go install github.com/aquasecurity/tfsec/cmd/tfsec@latest

# Verify
tfsec --version
```

## Basic Usage

```bash
# Scan current directory
tfsec .

# Scan with specific format
tfsec . --format=json > tfsec-results.json

# Scan with severity threshold (only show HIGH and CRITICAL)
tfsec . --minimum-severity HIGH

# Scan and exit 0 even with findings (for gradual adoption)
tfsec . --soft-fail

# Output as SARIF for GitHub Security tab
tfsec . --format=sarif --out tfsec.sarif
```

## Common Security Issues tfsec Catches

```hcl
# tfsec: aws-s3-no-public-access-with-acl
# FAIL: S3 bucket with public ACL
resource "aws_s3_bucket_acl" "example" {
  bucket = aws_s3_bucket.main.id
  acl    = "public-read"  # Security risk
}

# FIX: Keep private
resource "aws_s3_bucket_acl" "example" {
  bucket = aws_s3_bucket.main.id
  acl    = "private"
}

# tfsec: aws-ec2-no-public-ip-subnet
# FAIL: Subnet auto-assigns public IPs
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true  # Acceptable for public subnets, but flagged
}

# tfsec: aws-rds-specify-backup-retention
# FAIL: RDS with default backup retention
resource "aws_db_instance" "main" {
  allocated_storage    = 10
  engine               = "mysql"
  engine_version       = "5.7"
  instance_class       = "db.t3.micro"
  identifier           = "my-db"
  username             = "foo"
  password             = "foobarbaz"
  parameter_group_name = "default.mysql5.7"
  skip_final_snapshot  = true
}

# FIX:
resource "aws_db_instance" "main" {
  allocated_storage       = 10
  engine                  = "mysql"
  engine_version          = "5.7"
  instance_class          = "db.t3.micro"
  identifier              = "my-db"
  username                = "foo"
  password                = "foobarbaz"
  parameter_group_name    = "default.mysql5.7"
  backup_retention_period = 5
  skip_final_snapshot     = true
}

# tfsec: aws-iam-no-policy-wildcards
# FAIL: Overly permissive IAM policy
resource "aws_iam_policy" "admin" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["*"]       # Wildcard action
      Resource = ["*"]       # Wildcard resource
    }]
  })
}
```

## Inline Suppression

```hcl
#tfsec:ignore:aws-s3-enable-versioning
# Justification: Access logs don't need versioning
resource "aws_s3_bucket" "logs" {
  bucket = "access-logs-bucket"
}

# Or with expiry date (self-expiring suppression)
#tfsec:ignore:aws-ec2-no-public-ip-subnet:exp:2026-06-01
resource "aws_subnet" "bastion" {
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true
}
```

## Configuration File

```yaml
# .tfsec/config.yml
exclude:
  - aws-s3-enable-versioning          # Not required for log buckets
  - aws-s3-enable-bucket-logging       # Logging buckets don't log themselves

minimum_severity: MEDIUM
```

## Custom Checks in Rego

```rego
# .tfsec/custom_checks/require_kms.rego
package custom.aws.s3.require_kms

import data.lib.result

deny[res] {
    bucket := input.aws.s3.buckets[_]
    not bucket.encryption.enabled.value
    msg := sprintf("S3 bucket %s must have KMS encryption enabled", [bucket.name.value])
    res := result.new(msg, bucket)
}

deny[res] {
    bucket := input.aws.s3.buckets[_]
    bucket.encryption.enabled.value
    bucket.encryption.algorithm.value != "aws:kms"
    msg := sprintf("S3 bucket %s must use KMS encryption", [bucket.name.value])
    res := result.new(msg, bucket.encryption.algorithm)
}
```

```bash
tfsec . --rego-policy-dir .tfsec/custom_checks
```

## CI/CD Integration

```yaml
# .github/workflows/tfsec.yml
name: tfsec Security Scan

on: [pull_request]

jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: .
          format: sarif
          additional_args: --minimum-severity MEDIUM --out tfsec.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: tfsec.sarif
```

## tfsec vs Checkov vs Trivy

For new projects, Trivy is recommended as it absorbs tfsec's functionality while adding container scanning. For existing projects using tfsec, migration to Trivy is straightforward since Trivy uses the same Terraform scanning engine and accepts tfsec-style long rule IDs as aliases.

```bash
# Trivy with the same tfsec-style output
trivy config --format table .
```

## Conclusion

tfsec provides fast security scanning feedback on OpenTofu configurations. The inline suppression with `#tfsec:ignore:rule-id` is useful for legitimate exceptions, but always add a justification comment explaining why the finding is acceptable. For new projects, consider using Trivy directly as it includes tfsec's checks plus container scanning in a single tool.
