# How to Run tfsec in Docker for Terraform Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, tfsec, Terraform, Security, Static Analysis, DevSecOps, Infrastructure as Code, CI/CD

Description: Learn how to use tfsec in Docker to scan Terraform code for security misconfigurations and compliance violations.

---

Terraform makes infrastructure provisioning declarative and repeatable. But a syntactically valid Terraform plan can still create wildly insecure infrastructure. An S3 bucket with public access, a security group open to the world, an unencrypted RDS instance - these are all valid Terraform, and all terrible ideas. tfsec catches these problems before they reach production by statically analyzing your Terraform code for security issues.

Running tfsec in Docker means no local installation, consistent versions across your team, and easy integration into CI/CD pipelines. This guide covers everything from basic scanning to custom rules and pipeline integration.

## What tfsec Detects

tfsec checks your Terraform code against hundreds of built-in rules covering AWS, Azure, GCP, and other providers. It catches problems like:

- Unencrypted storage and databases
- Overly permissive security groups and firewall rules
- Public access to resources that should be private
- Missing logging and monitoring configurations
- Hardcoded secrets and credentials
- Non-compliant resource configurations

Each finding includes a severity level (CRITICAL, HIGH, MEDIUM, LOW), a description of the problem, and a link to documentation explaining how to fix it.

## Running tfsec in Docker

The tfsec team publishes official Docker images. Run a quick scan with a single command.

```bash
# Scan the current directory for Terraform security issues
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src
```

That is it. tfsec recursively scans all `.tf` files in the mounted directory and prints findings to stdout.

## Scanning a Sample Terraform Project

Create a Terraform file with some intentional security issues to see tfsec in action.

```hcl
# main.tf - Example with security issues for tfsec to detect
provider "aws" {
  region = "us-east-1"
}

# Issue: S3 bucket without encryption
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

# Issue: Security group allows all inbound traffic
resource "aws_security_group" "web" {
  name = "web-sg"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Issue: RDS instance without encryption and publicly accessible
resource "aws_db_instance" "database" {
  engine               = "mysql"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  publicly_accessible  = true
  storage_encrypted    = false
  skip_final_snapshot  = true
}

# Issue: IAM policy with wildcard permissions
resource "aws_iam_policy" "admin" {
  name = "admin-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = "*"
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}
```

Run tfsec against this file.

```bash
# Scan and see the findings
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src
```

tfsec will flag every issue: the unencrypted bucket, the open security group, the public and unencrypted database, and the wildcard IAM policy.

## Output Formats

tfsec supports multiple output formats for different use cases.

```bash
# JSON output for programmatic parsing
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --format json

# JUnit XML for CI systems that understand test results
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --format junit > tfsec-results.xml

# SARIF format for GitHub Security tab integration
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --format sarif > tfsec.sarif

# CSV for spreadsheet analysis
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --format csv > tfsec-results.csv

# Markdown for pull request comments
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --format markdown
```

## Filtering by Severity

Not every finding warrants blocking a deployment. Filter by severity to focus on critical issues first.

```bash
# Only show HIGH and CRITICAL findings
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --minimum-severity HIGH

# Only show CRITICAL findings
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src --minimum-severity CRITICAL
```

## Excluding Specific Rules

Some rules may not apply to your environment. Exclude them by ID.

```bash
# Exclude specific rules by their ID
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src \
  --exclude aws-s3-enable-bucket-logging,aws-s3-enable-versioning
```

You can also suppress findings inline in your Terraform code with comments.

```hcl
# Suppress a specific tfsec finding with a comment explaining why
resource "aws_s3_bucket" "public_assets" {
  bucket = "public-static-assets"

  # tfsec:ignore:aws-s3-enable-bucket-encryption - Public assets do not need encryption
}
```

## Configuration File

For project-wide settings, create a `.tfsec` configuration directory or a `tfsec.yml` file.

```yaml
# .tfsec/config.yml - Project-wide tfsec configuration
severity_overrides:
  # Downgrade this rule to LOW for our use case
  aws-s3-enable-bucket-logging: LOW

exclude:
  # We handle versioning through a different mechanism
  - aws-s3-enable-versioning

minimum_severity: MEDIUM
```

```bash
# Run tfsec with the configuration file
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src
```

tfsec automatically picks up the configuration from the `.tfsec` directory.

## Writing Custom Rules

tfsec supports custom rules written in JSON or Rego. Create rules specific to your organization's policies.

```json
{
  "checks": [
    {
      "code": "CUS001",
      "description": "S3 bucket names must start with company prefix",
      "impact": "Non-standard bucket naming makes resources hard to identify",
      "resolution": "Prefix bucket names with 'acme-'",
      "requiredTypes": ["resource"],
      "requiredLabels": ["aws_s3_bucket"],
      "severity": "MEDIUM",
      "matchSpec": {
        "name": "bucket",
        "action": "startsWith",
        "value": "acme-"
      },
      "errorMessage": "S3 bucket name must start with 'acme-'"
    }
  ]
}
```

Save this as `.tfsec/custom_checks.json` and tfsec will include it automatically.

```bash
# Run with custom rules (they load automatically from .tfsec/)
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src
```

## CI/CD Integration with GitHub Actions

Integrate tfsec into your pull request workflow to catch security issues before they are merged.

```yaml
# .github/workflows/tfsec.yml - Run tfsec on pull requests
name: Terraform Security Scan

on:
  pull_request:
    paths:
      - "terraform/**"
      - "*.tf"

jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tfsec
        run: |
          docker run --rm \
            -v "${{ github.workspace }}:/src" \
            aquasec/tfsec /src \
            --format sarif \
            --out /src/tfsec.sarif \
            --minimum-severity HIGH \
            --soft-fail

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: tfsec.sarif
```

The `--soft-fail` flag makes tfsec return exit code 0 even when findings exist, so the SARIF upload step still runs. The results appear in the GitHub Security tab.

## Using tfsec as a Pre-commit Hook

Catch issues before they even get committed.

```yaml
# .pre-commit-config.yaml - Run tfsec before commits
repos:
  - repo: local
    hooks:
      - id: tfsec
        name: tfsec
        entry: docker run --rm -v "$(pwd):/src" aquasec/tfsec /src --minimum-severity HIGH
        language: system
        files: '\.tf$'
        pass_filenames: false
```

## Scanning Terraform Modules

tfsec handles modules well. It follows module references and scans the module source code.

```bash
# Initialize modules before scanning (tfsec reads .terraform/ for modules)
docker run --rm \
  -v "$(pwd):/src" \
  -w /src \
  hashicorp/terraform:latest \
  init -backend=false

# Now scan with module resolution
docker run --rm \
  -v "$(pwd):/src" \
  aquasec/tfsec /src
```

## Wrapping Up

tfsec in Docker provides a fast, consistent way to catch Terraform security issues before they become production vulnerabilities. The zero-installation approach works across developer machines, CI systems, and pre-commit hooks. Start by scanning your existing Terraform code - you might be surprised what it finds. Then integrate it into your CI pipeline so every pull request gets checked automatically. Security scanning should be a speed bump, not a roadblock, and tfsec strikes that balance well.
