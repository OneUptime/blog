# How to Use Checkov for Policy Scanning with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Checkov, Policy Scanning, Security, Infrastructure as Code, DevOps

Description: Learn how to use Checkov to statically scan OpenTofu configurations for security misconfigurations and compliance violations before deployment.

## Introduction

Checkov is a static analysis tool from Bridgecrew that scans OpenTofu (and Terraform) configurations for hundreds of built-in security and compliance checks. Unlike workflows that evaluate only generated plan output, Checkov analyzes `.tf` files directly - catching issues as early as the pre-commit stage.

## Installing Checkov

```bash
# Install via pip

pip install checkov

# Or via Docker
docker pull bridgecrew/checkov

# Or via Homebrew
brew install checkov

checkov --version
```

## Running Checkov Against Configuration

```bash
# Scan the current directory
checkov -d .

# Scan a specific file
checkov -f main.tf

# Scan with compact output
checkov -d . --compact

# Scan and output to JUnit XML (for CI integration)
checkov -d . --output junitxml --output-file-path results.xml
```

## Sample Output

```text
Check: CKV_AWS_20: "S3 Bucket has an ACL defined which allows public READ access."
  FAILED for resource: aws_s3_bucket.app_data
  File: /main.tf:15-25

  | 15 | resource "aws_s3_bucket" "app_data" {
  | 16 |   bucket = "my-app-data"
  | 17 |   acl    = "public-read"    ← VIOLATION
  ...

Passed checks: 45, Failed checks: 3, Skipped checks: 0
```

## Common Checks and Their Fixes

```hcl
# Fix CKV_AWS_20: remove the public ACL from the bucket
resource "aws_s3_bucket" "app_data" {
  bucket = "my-app-data"
}

# Fix CKV_AWS_18: S3 bucket should have access logging
resource "aws_s3_bucket" "access_logs" {
  bucket = "my-access-logs"
}

resource "aws_s3_bucket_acl" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  acl    = "log-delivery-write"
}

resource "aws_s3_bucket_logging" "app_data" {
  bucket        = aws_s3_bucket.app_data.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "app-data-logs/"
}

# Fix CKV_AWS_21: S3 bucket should have versioning enabled
resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Suppressing False Positives

```hcl
# Suppress a check with a justification comment
resource "aws_s3_bucket" "public_website" {
  bucket = "my-public-website"

  #checkov:skip=CKV_AWS_20:This bucket is intentionally public - it hosts a static website
  #checkov:skip=CKV2_AWS_6:Public access block disabled intentionally for website hosting
}
```

## Scanning Terraform Plan Output

Checkov can also scan the JSON plan (not just `.tf` files):

```bash
# Generate plan and scan it
tofu plan -out=tfplan.binary
tofu show -json tfplan.binary > tfplan.json

checkov -f tfplan.json --framework terraform_plan
```

## GitHub Actions Integration

```yaml
- uses: actions/checkout@v4

- name: Checkov Security Scan
  uses: bridgecrewio/checkov-action@v12
  with:
    directory: .
    framework: terraform
    output_format: sarif
    output_file_path: results.sarif
    soft_fail: false  # Fail the pipeline on violations

- name: Upload Checkov Results
  uses: github/codeql-action/upload-sarif@v3
  if: success() || failure()
  with:
    sarif_file: results.sarif
```

## Selecting Specific Check Groups

```bash
# Run only AWS checks
checkov -d . --check CKV_AWS*

# Run only checks that prevent data exposure
checkov -d . --check CKV_AWS_18,CKV_AWS_19,CKV_AWS_20,CKV_AWS_21

# Skip specific checks
checkov -d . --skip-check CKV_AWS_126,CKV_AWS_118
```

## Conclusion

Checkov provides 1,000+ built-in security and compliance checks for OpenTofu configurations, covering AWS, Azure, GCP, and Kubernetes. Running it in pre-commit hooks catches violations before code review; running it in CI provides a blocking gate before merge. Use `.checkov.yaml` for project-wide suppression configuration and always require justification comments for any suppressed check.
