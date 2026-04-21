# How to Test OpenTofu Configurations with Checkov - Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Checkov, Security, Policy as Code, Infrastructure as Code

Description: Learn how to use Checkov to scan OpenTofu configurations for security misconfigurations and compliance violations before deploying infrastructure.

## Introduction

Checkov is an open-source static analysis tool that scans infrastructure-as-code for security and compliance issues. It supports OpenTofu and Terraform configurations, identifying hundreds of potential misconfigurations against best practices and compliance frameworks like CIS, PCI DSS, and SOC 2.

## Installing Checkov

```bash
pip install checkov
# or

brew install checkov
```

Verify:

```bash
checkov --version
```

## Running a Basic Scan

Scan your OpenTofu directory:

```bash
checkov -d ./modules/networking
```

Or scan a specific file:

```bash
checkov -f main.tf
```

## Understanding the Output

Checkov outputs pass/fail for each check:

```text
Check: CKV_AWS_23: "Ensure every security groups rule has a description"
  PASSED for resource: aws_security_group.web
  File: /main.tf:10-25

Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
  FAILED for resource: aws_security_group.web
  File: /main.tf:10-25
```

## Common Checks

| Check ID | Description |
|----------|-------------|
| CKV_AWS_57 | S3 public WRITE ACLs |
| CKV_AWS_23 | Security group descriptions |
| CKV_AWS_8 | EC2/launch configuration EBS encryption |
| CKV_AWS_79 | IMDSv2 required |
| CKV_AWS_111 | IAM write access without constraints |

## Skipping Specific Checks

Skip false positives with inline suppression:

```hcl
resource "aws_s3_bucket" "public_assets" {
  bucket = "my-public-assets"

  # checkov:skip=CKV_AWS_20:Public assets bucket intentionally public
}
```

Or skip via CLI:

```bash
checkov -d . --skip-check CKV_AWS_57,CKV_AWS_18
```

## Outputting Results as JSON

```bash
checkov -d . -o json > checkov-results.json
```

## CI/CD Integration

```yaml
# GitHub Actions
- name: Checkov Scan
  uses: bridgecrewio/checkov-action@master
  with:
    directory: .
    framework: terraform
    output_format: cli
    soft_fail: false
```

Or with plain CLI:

```yaml
- name: Run Checkov
  run: |
    pip install checkov
    checkov -d . --framework terraform
```

## Scanning Specific Checks

```bash
# Specific AWS checks only
checkov -d . --check CKV_AWS_20,CKV_AWS_57

# All checks matching a prefix
checkov -d . --check CKV_AWS*
```

## Conclusion

Integrating Checkov into your OpenTofu workflow catches security misconfigurations before they reach production. By combining Checkov in CI/CD pipelines with inline suppressions for accepted risks, you build a security gate that improves your infrastructure security posture systematically.
