# How to Use Terraform with Bridgecrew for Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Bridgecrew, Compliance, Security, Infrastructure as Code, DevOps, Policy as Code

Description: Learn how to use Terraform with Bridgecrew to enforce compliance policies, scan for misconfigurations, and maintain security standards in your infrastructure code.

---

Bridgecrew (now part of Palo Alto Networks' Prisma Cloud) is a cloud security platform that focuses on infrastructure as code security. Its open-source tool Checkov is one of the most widely used IaC scanning engines. This guide covers how to integrate Bridgecrew's scanning capabilities into your Terraform workflow to enforce compliance and catch security issues early in the development process.

## Why Use Bridgecrew with Terraform?

Bridgecrew provides specialized IaC security scanning that goes beyond basic linting. It understands the relationships between Terraform resources and can identify complex security issues like missing encryption chains, overly permissive access patterns, and compliance violations. The platform maps findings to industry compliance frameworks, making it easier to demonstrate compliance during audits.

Key features include over 1000 built-in security policies, compliance framework mapping (CIS, SOC2, HIPAA, PCI-DSS, NIST), automated fix suggestions for common issues, custom policy creation using Python or YAML, supply chain security for Terraform modules, and integration with CI/CD pipelines and IDEs.

## Prerequisites

You need Checkov installed (pip install checkov), optionally a Bridgecrew platform account for enhanced features, Terraform configurations to scan, and a CI/CD pipeline for automated scanning.

## Step 1: Install and Run Checkov

Checkov is Bridgecrew's open-source scanning engine for Terraform.

```bash
# Install Checkov
pip install checkov

# Run a basic scan on Terraform files
checkov -d terraform/

# Run with specific checks
checkov -d terraform/ --check CKV_AWS_18,CKV_AWS_19,CKV_AWS_145

# Run with a specific compliance framework
checkov -d terraform/ --framework terraform --check CIS_AWS

# Output in different formats
checkov -d terraform/ --output json > results.json
checkov -d terraform/ --output sarif > results.sarif
checkov -d terraform/ --output junitxml > results.xml

# Skip specific checks
checkov -d terraform/ --skip-check CKV_AWS_18,CKV2_AWS_6

# Scan with custom external checks
checkov -d terraform/ --external-checks-dir custom_policies/
```

## Step 2: Understanding Checkov Output

When Checkov scans your Terraform files, it produces detailed output showing passed and failed checks.

```hcl
# example.tf
# This file demonstrates what Checkov checks for

# This configuration has several compliance issues
resource "aws_s3_bucket" "data" {
  bucket = "company-data-bucket"

  # CKV_AWS_18: FAILED - No logging configured
  # CKV_AWS_19: FAILED - No encryption configured
  # CKV_AWS_21: FAILED - No versioning configured
  # CKV2_AWS_6: FAILED - No public access block
  # CKV_AWS_145: FAILED - No KMS encryption
}

# This configuration passes all checks
resource "aws_s3_bucket" "compliant_data" {
  bucket = "compliant-data-bucket"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "compliant_data" {
  bucket = aws_s3_bucket.compliant_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "compliant_data" {
  bucket = aws_s3_bucket.compliant_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "compliant_data" {
  bucket = aws_s3_bucket.compliant_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_logging" "compliant_data" {
  bucket = aws_s3_bucket.compliant_data.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "data-bucket-logs/"
}
```

## Step 3: Custom Policy Creation

Create custom Checkov policies for organization-specific requirements.

```python
# custom_policies/require_tags.py
# Custom Checkov policy requiring specific tags on all taggable resources

from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RequireStandardTags(BaseResourceCheck):
    def __init__(self):
        name = "Ensure all resources have required standard tags"
        id = "CKV_CUSTOM_001"
        # Apply to all resources that support tags
        supported_resources = [
            "aws_instance", "aws_s3_bucket", "aws_rds_cluster",
            "aws_rds_cluster_instance", "aws_db_instance",
            "aws_lambda_function", "aws_ecs_cluster",
            "aws_eks_cluster", "aws_vpc", "aws_subnet",
            "aws_security_group", "aws_lb",
        ]
        categories = [CheckCategories.GENERAL_SECURITY]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_resources=supported_resources,
        )

    def scan_resource_conf(self, conf):
        required_tags = {"Environment", "Owner", "ManagedBy", "CostCenter"}

        tags = conf.get("tags", [{}])
        if isinstance(tags, list):
            tags = tags[0] if tags else {}

        if not tags:
            return CheckResult.FAILED

        present_tags = set(tags.keys())
        missing_tags = required_tags - present_tags

        if missing_tags:
            return CheckResult.FAILED
        return CheckResult.PASSED

check = RequireStandardTags()
```

```python
# custom_policies/restrict_regions.py
# Custom policy restricting allowed AWS regions

from checkov.terraform.checks.provider.base_provider_check import BaseProviderCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RestrictAWSRegions(BaseProviderCheck):
    def __init__(self):
        name = "Ensure AWS resources are deployed in approved regions only"
        id = "CKV_CUSTOM_002"
        supported_provider = ["aws"]
        categories = [CheckCategories.GENERAL_SECURITY]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_provider=supported_provider,
        )

    def scan_provider_conf(self, conf):
        allowed_regions = [
            "us-east-1", "us-west-2", "eu-west-1", "eu-central-1"
        ]

        region = conf.get("region", [None])
        if isinstance(region, list):
            region = region[0]

        if region and region in allowed_regions:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = RestrictAWSRegions()
```

```yaml
# custom_policies/yaml_policies/require_deletion_protection.yaml
# YAML-based custom policy
metadata:
  id: "CKV_CUSTOM_003"
  name: "Ensure RDS instances have deletion protection enabled"
  category: "BACKUP_AND_RECOVERY"
  severity: "HIGH"

definition:
  cond_type: "attribute"
  resource_types:
    - "aws_db_instance"
    - "aws_rds_cluster"
  attribute: "deletion_protection"
  operator: "is_true"
```

## Step 4: CI/CD Pipeline Integration

Integrate Bridgecrew scanning into your CI/CD pipeline.

```yaml
# .github/workflows/terraform-bridgecrew.yml
name: Terraform Compliance with Bridgecrew

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  bridgecrew-scan:
    runs-on: ubuntu-latest
    name: Bridgecrew IaC Scan
    steps:
      - uses: actions/checkout@v4

      # Run Checkov with Bridgecrew integration
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          # Connect to Bridgecrew platform
          api-key: ${{ secrets.BC_API_KEY }}
          # Framework to scan
          framework: terraform
          # Output format
          output_format: sarif
          output_file_path: checkov-results.sarif
          # Only fail on HIGH and CRITICAL
          soft_fail_on: LOW,MEDIUM
          # Include external custom checks
          external_checks_dirs: custom_policies/
          # Compact output
          compact: true
          # Download external modules
          download_external_modules: true

      # Post results as PR comment
      - name: Post Compliance Results
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('checkov-results.sarif', 'utf8'));
            const failures = results.runs[0].results.filter(r => r.level === 'error');

            let comment = '## Bridgecrew Compliance Scan Results\n\n';
            if (failures.length === 0) {
              comment += 'All compliance checks passed.\n';
            } else {
              comment += `Found ${failures.length} compliance issue(s):\n\n`;
              failures.forEach(f => {
                comment += `- **${f.ruleId}**: ${f.message.text}\n`;
              });
            }

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: comment
            });

      # Upload SARIF to GitHub Security
      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: checkov-results.sarif

  # Only proceed to plan if compliance passes
  terraform-plan:
    needs: bridgecrew-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        working-directory: terraform
        run: |
          terraform init
          terraform plan -out=tfplan

      # Scan the plan file
      - name: Scan Terraform Plan
        run: |
          cd terraform
          terraform show -json tfplan > tfplan.json
          checkov -f tfplan.json --framework terraform_plan
```

## Step 5: Bridgecrew Platform Features

Use the Bridgecrew platform for enhanced compliance management.

```bash
# Connect your repository to Bridgecrew platform
checkov -d terraform/ \
  --bc-api-key "$BC_API_KEY" \
  --repo-id "org/infrastructure"

# Generate a compliance report
checkov -d terraform/ \
  --bc-api-key "$BC_API_KEY" \
  --framework terraform \
  --check CIS_AWS \
  --output json > cis-report.json
```

The Bridgecrew platform provides a dashboard showing compliance posture trends, drift detection between scans, automated fix pull requests for common issues, and compliance reporting for CIS, SOC2, HIPAA, and PCI-DSS.

## Step 6: Automated Fix Generation

Bridgecrew can suggest and auto-generate fixes for common issues.

```bash
# Generate fixes for failed checks
checkov -d terraform/ --output cli --compact

# Bridgecrew platform can create fix PRs automatically
# Enable this in the Bridgecrew platform settings
```

Example of a fix Bridgecrew would suggest:

```hcl
# Before (fails CKV_AWS_145)
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

# After (Bridgecrew suggested fix)
resource "aws_s3_bucket" "data" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}
```

## Step 7: Compliance Reporting

Generate compliance reports for audit purposes.

```bash
# Generate a CIS AWS benchmark report
checkov -d terraform/ --framework terraform --check CIS_AWS --output json > cis-aws-report.json

# Generate SOC2 compliance report
checkov -d terraform/ --framework terraform --check SOC2 --output json > soc2-report.json

# Generate a comprehensive report with all frameworks
checkov -d terraform/ \
  --framework terraform \
  --output json \
  --bc-api-key "$BC_API_KEY" > full-compliance-report.json
```

## Best Practices

Run Checkov locally during development with IDE extensions for immediate feedback. Use severity-based thresholds in CI/CD pipelines to distinguish between blocking and advisory findings. Create custom policies for organization-specific requirements that standard checks do not cover. Connect to the Bridgecrew platform for centralized compliance visibility and trending. Map your custom policies to specific compliance framework controls for audit purposes. Regularly review and update skipped checks to ensure they remain valid. Use the download-external-modules flag to scan referenced Terraform modules. Generate compliance reports before audits to identify and address gaps proactively.

## Conclusion

Bridgecrew and its Checkov engine provide comprehensive compliance scanning for Terraform configurations. With over 1000 built-in policies, compliance framework mapping, and the ability to create custom checks, it covers both common security misconfigurations and organization-specific requirements. By integrating Bridgecrew into your Terraform workflow through CI/CD pipelines, IDE extensions, and the Bridgecrew platform, you create a continuous compliance process that catches issues early and provides the reporting necessary for regulatory audits.
