# How to Use tfsec for Static Security Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, tfsec, Security, Static Analysis, DevSecOps

Description: Learn how to integrate tfsec into your Terraform workflow to catch security misconfigurations before they reach your cloud infrastructure.

---

Finding security issues in your Terraform code after deployment is painful and expensive. tfsec is a static analysis tool that scans your Terraform files and flags security problems before you ever run `terraform apply`. It catches things like unencrypted storage, overly permissive IAM policies, and public access to resources that should be private.

This guide walks through installing tfsec, running it against your code, integrating it into CI/CD, and handling its output effectively.

## What tfsec Does

tfsec reads your `.tf` files and checks them against a large set of built-in security rules. It understands Terraform's HCL syntax natively, so it can follow variable references, evaluate expressions, and understand module structures. This is a big advantage over generic pattern-matching tools.

It covers all the major cloud providers:

- AWS (200+ rules)
- Azure (150+ rules)
- Google Cloud (100+ rules)
- General Terraform rules (provider-agnostic)

## Installation

There are several ways to install tfsec:

```bash
# macOS with Homebrew
brew install tfsec

# Linux (download binary)
curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash

# Go install
go install github.com/aquasecurity/tfsec/cmd/tfsec@latest

# Docker (no installation required)
docker run --rm -v "$(pwd):/src" aquasec/tfsec /src
```

Verify the installation:

```bash
tfsec --version
```

## Running Your First Scan

Point tfsec at your Terraform directory:

```bash
# Scan the current directory
tfsec .

# Scan a specific directory
tfsec ./environments/production

# Scan with a specific output format
tfsec . --format json
```

The output looks something like this:

```text
Result #1 CRITICAL Security group rule allows ingress from public internet.
────────────────────────────────────────────────────────────────────
  main.tf:15-22
────────────────────────────────────────────────────────────────────
   15 │ resource "aws_security_group_rule" "allow_all" {
   16 │   type              = "ingress"
   17 │   from_port         = 0
   18 │   to_port           = 65535
   19 │   protocol          = "tcp"
   20 │   cidr_blocks       = ["0.0.0.0/0"]
   21 │   security_group_id = aws_security_group.main.id
   22 │ }
────────────────────────────────────────────────────────────────────
  ID:          aws-vpc-no-public-ingress-sgr
  Impact:      The port is exposed for ingress from the internet
  Resolution:  Set a more restrictive cidr range

  See https://aquasecurity.github.io/tfsec/latest/checks/aws/vpc/no-public-ingress-sgr/
```

Each finding includes the severity, the specific code location, and a link to documentation explaining the issue and how to fix it.

## Understanding Severity Levels

tfsec classifies findings into four severity levels:

- **CRITICAL**: Issues that likely expose your infrastructure to direct attack (e.g., public S3 buckets, unrestricted security groups)
- **HIGH**: Significant security weaknesses (e.g., missing encryption, weak IAM policies)
- **MEDIUM**: Misconfigurations that weaken your security posture (e.g., missing logging, default VPCs)
- **LOW**: Best practice recommendations (e.g., missing descriptions, resource tagging)

Filter by severity when you need to focus on what matters most:

```bash
# Only show critical and high severity issues
tfsec . --minimum-severity HIGH
```

## Integrating tfsec into CI/CD

The real value of tfsec comes from running it automatically on every pull request.

### GitHub Actions

```yaml
name: Terraform Security Scan
on:
  pull_request:
    paths:
      - '**.tf'

jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          # Fail the build on high and critical issues
          soft_fail: false
          additional_args: --minimum-severity HIGH

      - name: tfsec with SARIF output
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          sarif_file: tfsec.sarif
          soft_fail: true

      # Upload results to GitHub Security tab
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: tfsec.sarif
```

### GitLab CI

```yaml
tfsec:
  stage: security
  image:
    name: aquasec/tfsec-ci:latest
    entrypoint: [""]
  script:
    - tfsec . --format json --out tfsec-results.json --soft-fail
    - tfsec . --minimum-severity HIGH
  artifacts:
    paths:
      - tfsec-results.json
    reports:
      terraform: tfsec-results.json
  rules:
    - changes:
        - "**/*.tf"
```

### Pre-commit Hook

Catch issues before they even get committed:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.86.0
    hooks:
      - id: terraform_tfsec
        args:
          - --args=--minimum-severity HIGH
```

## Handling False Positives

Not every tfsec finding is a real problem. Sometimes you intentionally configure something that tfsec flags. You can suppress specific findings with inline comments:

```hcl
# This is a public-facing load balancer that needs to accept
# traffic from the internet. Suppressing the public ingress check.
resource "aws_security_group_rule" "alb_ingress" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"] #tfsec:ignore:aws-vpc-no-public-ingress-sgr
  security_group_id = aws_security_group.alb.id
}
```

You can also use a configuration file for broader suppressions:

```yaml
# .tfsec/config.yml
severity_overrides:
  # Downgrade this check for our use case
  aws-s3-enable-versioning: LOW

exclude:
  # We handle logging at the organization level
  - aws-cloudtrail-ensure-cloudtrail-enabled
```

## Custom Rules

If the built-in rules do not cover your organization's requirements, you can write custom rules:

```json
{
  "checks": [
    {
      "code": "CUS001",
      "description": "All EC2 instances must use the approved AMI prefix",
      "impact": "Unapproved AMIs may contain security vulnerabilities",
      "resolution": "Use an AMI that starts with ami-approved-",
      "requiredTypes": ["resource"],
      "requiredLabels": ["aws_instance"],
      "severity": "HIGH",
      "matchSpec": {
        "name": "ami",
        "action": "startsWith",
        "value": "ami-approved-"
      },
      "errorMessage": "EC2 instance is using a non-approved AMI"
    }
  ]
}
```

Save this as `.tfsec/custom_checks.json` and tfsec will pick it up automatically.

## Generating Reports

For compliance and audit purposes, generate reports in various formats:

```bash
# JSON report for programmatic processing
tfsec . --format json --out report.json

# JUnit XML for CI/CD integration
tfsec . --format junit --out report.xml

# CSV for spreadsheet analysis
tfsec . --format csv --out report.csv

# SARIF for GitHub Security integration
tfsec . --format sarif --out report.sarif
```

## tfsec vs. Trivy

It is worth noting that tfsec has been integrated into Trivy, another Aqua Security tool. Trivy provides a broader scanning capability that includes container images, file systems, and IaC. If you are already using Trivy, you get tfsec's rules for free. If you only need Terraform scanning, tfsec is a lighter-weight option.

```bash
# Running Terraform scanning through Trivy
trivy config --severity HIGH,CRITICAL .
```

## Wrapping Up

tfsec is straightforward to set up and catches a significant percentage of common Terraform security mistakes. Start by running it locally, integrate it into your CI/CD pipeline, and gradually work through the findings. The goal is not to have zero findings from day one but to prevent new security issues from being introduced and steadily improve your baseline.

For monitoring your infrastructure after deployment, [OneUptime](https://oneuptime.com) provides comprehensive observability including uptime monitoring, logs, and incident management.
