# How to Use Checkov for Compliance Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Checkov, Compliance, Security, Infrastructure as Code

Description: A hands-on guide to using Checkov for scanning Terraform configurations against compliance frameworks like CIS, SOC 2, and HIPAA.

---

Compliance scanning is one of those things that nobody enjoys but everybody needs. If you manage cloud infrastructure with Terraform, you are probably subject to at least one compliance framework - CIS Benchmarks, SOC 2, HIPAA, PCI DSS, or something similar. Checkov is an open-source tool from Bridgecrew (now part of Palo Alto Networks) that scans your Terraform code against hundreds of built-in policies mapped to these frameworks.

This guide covers setting up Checkov, running scans, interpreting results, writing custom policies, and integrating it into your development workflow.

## Why Checkov

Checkov stands out from other IaC scanning tools for a few reasons:

- It supports over 1000 built-in policies across AWS, Azure, GCP, and Kubernetes
- Policies are mapped to compliance frameworks (CIS, NIST, PCI DSS, HIPAA, SOC 2)
- It can scan Terraform HCL, Terraform plans, CloudFormation, Kubernetes manifests, Dockerfiles, and more
- It understands Terraform module relationships and variable resolution
- Custom policies can be written in Python or simple YAML

## Installation

Checkov is a Python package:

```bash
# Install with pip
pip install checkov

# Or use pipx for isolated installation
pipx install checkov

# Or run via Docker
docker run --rm -v "$(pwd):/tf" bridgecrew/checkov -d /tf

# Verify installation
checkov --version
```

## Running Your First Scan

Point Checkov at your Terraform directory:

```bash
# Scan a directory
checkov -d ./infrastructure

# Scan a specific file
checkov -f main.tf

# Scan a Terraform plan file (JSON format)
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
checkov -f tfplan.json
```

The output groups findings by check status:

```
Passed checks: 45, Failed checks: 8, Skipped checks: 2

Check: CKV_AWS_18: "Ensure the S3 bucket has access logging enabled"
    PASSED for resource: aws_s3_bucket.logs
    File: /storage.tf:1-15

Check: CKV_AWS_19: "Ensure the S3 bucket has server-side encryption"
    FAILED for resource: aws_s3_bucket.data
    File: /storage.tf:17-25
    Guide: https://docs.bridgecrew.io/docs/s3_14-data-encrypted-at-rest
```

## Scanning Against Specific Compliance Frameworks

One of Checkov's best features is the ability to scan against a specific framework:

```bash
# Scan against CIS AWS Foundations Benchmark
checkov -d . --framework terraform --check CKV_AWS*

# Scan against specific compliance framework
checkov -d . --compliance-framework cis_aws

# Available frameworks include:
# cis_aws, cis_azure, cis_gcp, cis_kubernetes
# hipaa, pci_dss, soc2, nist_800_53
```

This is extremely useful when preparing for an audit. You can show your auditors exactly which checks pass and which are being remediated.

## Understanding Check IDs

Checkov check IDs follow a naming convention:

- `CKV_AWS_*` - AWS-specific checks
- `CKV_AZURE_*` - Azure-specific checks
- `CKV_GCP_*` - GCP-specific checks
- `CKV_K8S_*` - Kubernetes checks
- `CKV2_AWS_*` - Graph-based AWS checks (cross-resource analysis)

Graph-based checks are particularly powerful because they analyze relationships between resources:

```bash
# Example: CKV2_AWS_6 checks that S3 buckets have a public access block
# This requires analyzing both the bucket and its public_access_block resource
checkov -d . --check CKV2_AWS_6
```

## Skipping Checks

When a finding is a known exception, you can skip it with inline comments:

```hcl
# This bucket intentionally has public read access for static website hosting
resource "aws_s3_bucket" "website" {
  #checkov:skip=CKV_AWS_18:Access logging handled by CloudFront
  #checkov:skip=CKV_AWS_20:Public access required for static website

  bucket = "my-public-website"
}
```

Or skip checks globally via the command line:

```bash
# Skip specific checks
checkov -d . --skip-check CKV_AWS_18,CKV_AWS_20

# Skip checks using a config file
checkov -d . --config-file .checkov.yml
```

Create a `.checkov.yml` configuration file:

```yaml
# .checkov.yml
compact: true
directory:
  - ./infrastructure
framework:
  - terraform
skip-check:
  - CKV_AWS_18  # Logging handled at org level
  - CKV_AWS_20  # Public website buckets
soft-fail-on:
  - CKV_AWS_79  # IMDSv2 - migrating gradually
output:
  - cli
  - json
```

## Writing Custom Policies in YAML

For organization-specific requirements, you can write custom policies. YAML policies are the easiest to create:

```yaml
# custom_policies/require_team_tag.yaml
metadata:
  id: "CKV2_CUSTOM_1"
  name: "Ensure all resources have a Team tag"
  category: "GENERAL_SECURITY"
  guidelines: "All resources must have a Team tag for ownership tracking"
definition:
  cond_type: "attribute"
  resource_types:
    - "aws_instance"
    - "aws_s3_bucket"
    - "aws_rds_cluster"
    - "aws_lambda_function"
  attribute: "tags.Team"
  operator: "exists"
```

```yaml
# custom_policies/restrict_instance_types.yaml
metadata:
  id: "CKV2_CUSTOM_2"
  name: "Ensure EC2 instances use approved instance types"
  category: "GENERAL_SECURITY"
definition:
  cond_type: "attribute"
  resource_types:
    - "aws_instance"
  attribute: "instance_type"
  operator: "within"
  value:
    - "t3.micro"
    - "t3.small"
    - "t3.medium"
    - "t3.large"
    - "m5.large"
    - "m5.xlarge"
```

Run with custom policies:

```bash
checkov -d . --external-checks-dir ./custom_policies
```

## Writing Custom Policies in Python

For more complex logic, use Python:

```python
# custom_policies/check_rds_backup.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RDSBackupRetention(BaseResourceCheck):
    def __init__(self):
        name = "Ensure RDS instances have at least 14 days backup retention"
        id = "CKV_CUSTOM_3"
        supported_resources = ["aws_db_instance", "aws_rds_cluster"]
        categories = [CheckCategories.BACKUP_AND_RECOVERY]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_resources=supported_resources,
        )

    def scan_resource_conf(self, conf):
        backup_retention = conf.get("backup_retention_period", [0])
        if isinstance(backup_retention, list):
            backup_retention = backup_retention[0]

        if backup_retention and int(backup_retention) >= 14:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = RDSBackupRetention()
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Checkov Compliance Scan
on:
  pull_request:
    paths:
      - '**.tf'

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: ./infrastructure
          framework: terraform
          soft_fail: false
          output_format: cli,sarif
          output_file_path: console,checkov.sarif
          config_file: .checkov.yml

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: checkov.sarif
```

### GitLab CI

```yaml
checkov:
  stage: security
  image:
    name: bridgecrew/checkov:latest
    entrypoint: [""]
  script:
    - checkov -d ./infrastructure
      --output cli
      --output json
      --output-file-path console,checkov-results.json
      --config-file .checkov.yml
  artifacts:
    paths:
      - checkov-results.json
  rules:
    - changes:
        - "**/*.tf"
```

## Generating Compliance Reports

For audit preparation, generate detailed reports:

```bash
# JSON report with all details
checkov -d . --output json --output-file-path checkov-report.json

# JUnit XML for CI systems
checkov -d . --output junitxml --output-file-path checkov-report.xml

# Generate a CIS compliance report
checkov -d . --compliance-framework cis_aws --output json \
  --output-file-path cis-compliance-report.json

# Multiple output formats at once
checkov -d . \
  --output cli \
  --output json \
  --output sarif \
  --output-file-path console,report.json,report.sarif
```

## Wrapping Up

Checkov makes compliance scanning practical by mapping infrastructure checks directly to compliance frameworks. Start with the built-in checks, add custom policies for your organization's requirements, and integrate it into your CI/CD pipeline so that non-compliant code never makes it to production. The combination of framework-mapped checks and the ability to generate audit-ready reports makes it a solid choice for teams dealing with regulatory requirements.

To monitor your compliant infrastructure in production, [OneUptime](https://oneuptime.com) offers uptime monitoring, incident management, and observability tools that help you stay on top of your operational health.
