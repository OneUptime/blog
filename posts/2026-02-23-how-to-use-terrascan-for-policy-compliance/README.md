# How to Use Terrascan for Policy Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terrascan, Policy Compliance, Security, OPA

Description: A practical guide to using Terrascan for policy-as-code compliance scanning of your Terraform infrastructure configurations.

---

Terrascan is an open-source static code analyzer for Infrastructure as Code that focuses on policy compliance. Built by Tenable (formerly Accurics), it uses Open Policy Agent (OPA) under the hood, which means you get the full power of Rego for writing custom policies. If your organization has specific compliance requirements that go beyond what generic security scanners catch, Terrascan is worth a serious look.

This guide walks through setting up Terrascan, running compliance scans, writing custom policies, and integrating it into your workflow.

## What Makes Terrascan Different

Terrascan brings a few things to the table that other IaC scanners do not:

- Native OPA/Rego policy engine, so your custom policies use a well-known standard
- Over 500 built-in policies across AWS, Azure, GCP, and Kubernetes
- Support for multiple IaC frameworks: Terraform, CloudFormation, Kubernetes, Helm, Kustomize, Dockerfiles
- A server mode for centralized scanning
- Git hook integration for pre-commit checks

## Installation

```bash
# macOS with Homebrew
brew install terrascan

# Linux binary
curl -L "$(curl -s https://api.github.com/repos/tenable/terrascan/releases/latest \
  | grep -o -E 'https://.+?_Linux_x86_64.tar.gz')" > terrascan.tar.gz
tar -xf terrascan.tar.gz terrascan && rm terrascan.tar.gz
sudo install terrascan /usr/local/bin && rm terrascan

# Docker
docker run --rm -v "$(pwd):/iac" tenable/terrascan scan -d /iac

# Go install
go install github.com/tenable/terrascan/cmd/terrascan@latest

# Initialize (downloads policies)
terrascan init
```

## Running Your First Scan

```bash
# Scan current directory
terrascan scan

# Scan a specific directory with Terraform
terrascan scan -i terraform -d ./infrastructure

# Scan with specific policy types
terrascan scan -i terraform -d . -p aws

# Output as JSON
terrascan scan -i terraform -d . -o json

# Show only violations (skip passed checks)
terrascan scan -i terraform -d . --show-passed=false
```

The output includes the policy name, severity, resource, and a description:

```
Violation Details -

        Description    : Ensure S3 bucket has server-side encryption enabled
        File           : storage.tf
        Module Name    : root
        Plan Root      : ./
        Line           : 15
        Severity       : HIGH
        Rule Name      : s3BucketSSEEnabled
        Rule ID        : AC_AWS_0207
        Resource Name  : aws_s3_bucket.data
        Resource Type  : aws_s3_bucket
        Category       : Data Protection

Scan Summary -

        File/Folder         : ./
        IaC Type            : terraform
        Scanned At          : 2026-02-23 10:30:00 UTC
        Policies Validated  : 150
        Violated Policies   : 8
        Low                 : 2
        Medium              : 3
        High                : 2
        Critical            : 1
```

## Scanning Against Specific Policy Categories

Terrascan organizes policies into categories that align with common compliance requirements:

```bash
# Scan only for data protection issues
terrascan scan -i terraform -d . --categories "Data Protection"

# Scan for identity and access management issues
terrascan scan -i terraform -d . --categories "Identity and Access Management"

# Multiple categories
terrascan scan -i terraform -d . \
  --categories "Data Protection" \
  --categories "Logging" \
  --categories "Network Security"

# Available categories include:
# - Data Protection
# - Identity and Access Management
# - Infrastructure Security
# - Logging
# - Network Security
# - Resilience
# - Compliance Validation
```

## Scanning Terraform Plans

For more accurate results, scan the Terraform plan output:

```bash
# Generate plan JSON
terraform init
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json

# Scan the plan
terrascan scan -i terraform -f tfplan.json --config-only
```

Plan scanning resolves variables and data sources, giving you a more complete picture of what will actually be deployed.

## Writing Custom Policies with Rego

This is where Terrascan really shines. Custom policies use OPA's Rego language, which is expressive and well-documented.

Create a policy directory structure:

```
custom-policies/
  aws/
    require_encryption/
      require_encryption.rego
      require_encryption.json
```

Write the Rego policy:

```rego
# custom-policies/aws/require_encryption/require_encryption.rego
package accurics

# Rule: All EBS volumes must be encrypted
requiredEncryptionEBS[api.id] {
    api := input.aws_ebs_volume[_]
    not api.config.encrypted
}

# Rule: All RDS instances must have storage encryption
requiredEncryptionRDS[api.id] {
    api := input.aws_db_instance[_]
    not api.config.storage_encrypted
}
```

Create the accompanying metadata file:

```json
{
    "name": "requiredEncryption",
    "file": "require_encryption.rego",
    "policy_type": "aws",
    "resource_type": "aws_ebs_volume",
    "template_args": {
        "name": "requiredEncryptionEBS",
        "prefix": "",
        "suffix": ""
    },
    "severity": "HIGH",
    "description": "All storage resources must have encryption enabled",
    "category": "Data Protection",
    "version": 1,
    "id": "CUSTOM_AWS_001"
}
```

Run with custom policies:

```bash
terrascan scan -i terraform -d . -p ./custom-policies
```

## Server Mode

Terrascan can run as a server, which is useful for centralized policy enforcement:

```bash
# Start Terrascan server
terrascan server --port 9010

# Send a scan request
curl -X POST "http://localhost:9010/v1/terraform/v12/aws/local/file/scan" \
  -F "file=@main.tf" \
  -H "Content-Type: multipart/form-data"
```

You can also use server mode as a Kubernetes admission controller to prevent non-compliant resources from being deployed.

## Skipping Specific Rules

When you need to suppress a finding:

```hcl
# In-file skip
#ts:skip=AC_AWS_0207 Encryption handled by AWS Organization SCP
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}
```

Or use a configuration file:

```toml
# .terrascan-config.toml
[severity]
level = "high"

[rules]
skip-rules = [
    "AC_AWS_0207",  # S3 encryption - handled at org level
    "AC_AWS_0214"   # CloudTrail - configured centrally
]

[notifications]
webhook-url = "https://hooks.slack.com/services/T00000/B00000/XXXX"
```

Run with the config file:

```bash
terrascan scan -i terraform -d . --config-path .terrascan-config.toml
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Terrascan Policy Check
on:
  pull_request:
    paths:
      - '**.tf'

jobs:
  terrascan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Terrascan
        uses: tenable/terrascan-action@main
        with:
          iac_type: 'terraform'
          iac_dir: './infrastructure'
          policy_type: 'aws'
          sarif_upload: true
          scm_token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: terrascan.sarif
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/tenable/terrascan
    rev: v1.19.0
    hooks:
      - id: terrascan
        args:
          - '-i terraform'
          - '-p aws'
          - '--severity HIGH'
```

## Generating Compliance Reports

```bash
# JSON report for programmatic processing
terrascan scan -i terraform -d . -o json > compliance-report.json

# SARIF for GitHub integration
terrascan scan -i terraform -d . -o sarif > compliance-report.sarif

# XML for CI/CD systems
terrascan scan -i terraform -d . -o xml > compliance-report.xml

# YAML output
terrascan scan -i terraform -d . -o yaml > compliance-report.yaml
```

Parse JSON output to create custom compliance dashboards:

```bash
# Count violations by severity
terrascan scan -i terraform -d . -o json 2>/dev/null | \
  jq '.results.violations | group_by(.severity) | map({severity: .[0].severity, count: length})'
```

## Wrapping Up

Terrascan is a solid choice for organizations that need policy compliance scanning with the flexibility of OPA/Rego for custom policies. Its server mode and admission controller capability make it suitable for enterprise environments where you need centralized policy enforcement. Start with the built-in policies, create custom ones for your organization's specific requirements, and integrate it into your CI/CD pipeline.

For monitoring the health of your deployed infrastructure, check out [OneUptime](https://oneuptime.com) for comprehensive uptime monitoring, alerting, and incident management.
