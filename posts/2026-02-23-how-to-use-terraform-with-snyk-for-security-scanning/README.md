# How to Use Terraform with Snyk for Security Scanning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Snyk, Security, DevOps, Infrastructure as Code, Vulnerability Scanning

Description: Learn how to use Terraform with Snyk to scan your infrastructure code for security vulnerabilities, misconfigurations, and compliance issues before deployment.

---

Snyk is a developer-first security platform that helps find and fix vulnerabilities in code, dependencies, containers, and infrastructure as code. Snyk's IaC scanning capability analyzes Terraform configurations to detect security misconfigurations before they reach production. This guide covers how to integrate Snyk into your Terraform workflow for comprehensive security scanning.

## Why Use Snyk with Terraform?

Snyk brings several advantages to Terraform security scanning. It provides a developer-friendly experience with clear remediation advice, integrates directly into IDEs and CI/CD pipelines, maintains a continuously updated database of security rules, supports multiple compliance frameworks out of the box, and offers both CLI and web-based scanning options.

Common issues Snyk catches include overly permissive IAM policies, unencrypted storage and databases, publicly accessible resources, missing logging and monitoring, insecure network configurations, and non-compliant resource settings.

## Prerequisites

You need a Snyk account (free tier available), the Snyk CLI installed, Terraform configurations to scan, and optionally a CI/CD pipeline for automated scanning.

## Step 1: Install and Configure Snyk

Set up the Snyk CLI and authenticate.

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate with your Snyk account
snyk auth

# Verify the installation
snyk --version
```

## Step 2: Scan Terraform Files Locally

Run Snyk IaC scanning on your Terraform configurations.

```bash
# Scan all Terraform files in the current directory
snyk iac test

# Scan a specific directory
snyk iac test terraform/

# Scan a specific file
snyk iac test terraform/main.tf

# Scan with a specific severity threshold
snyk iac test --severity-threshold=high

# Output results in JSON format
snyk iac test --json > snyk-results.json

# Scan and report to the Snyk web UI
snyk iac test --report
```

Example Terraform configurations and the issues Snyk would detect:

```hcl
# examples/insecure.tf
# These configurations contain security issues that Snyk will flag

# Issue: S3 bucket without encryption
resource "aws_s3_bucket" "insecure" {
  bucket = "my-insecure-bucket"

  # Missing: server_side_encryption_configuration
  # Missing: versioning
  # Missing: logging
}

# Issue: Security group with unrestricted access
resource "aws_security_group" "open" {
  name = "open-sg"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]  # Snyk flags this as high severity
  }
}

# Issue: RDS without encryption
resource "aws_db_instance" "unencrypted" {
  engine         = "mysql"
  instance_class = "db.t3.micro"
  # Missing: storage_encrypted = true
  # Missing: backup_retention_period
  publicly_accessible = true  # Snyk flags this
}
```

```hcl
# examples/secure.tf
# These configurations follow security best practices

# Secure S3 bucket configuration
resource "aws_s3_bucket" "secure" {
  bucket = "my-secure-bucket"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Enable encryption on the bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "secure" {
  bucket = aws_s3_bucket.secure.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "secure" {
  bucket = aws_s3_bucket.secure.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "secure" {
  bucket = aws_s3_bucket.secure.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable logging
resource "aws_s3_bucket_logging" "secure" {
  bucket = aws_s3_bucket.secure.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/"
}

# Secure RDS instance
resource "aws_db_instance" "secure" {
  engine              = "mysql"
  instance_class      = "db.t3.micro"
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.rds.arn
  publicly_accessible = false

  backup_retention_period = 7
  deletion_protection     = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.private.name
}
```

## Step 3: CI/CD Pipeline Integration

Integrate Snyk into your CI/CD pipeline for automated scanning.

```yaml
# .github/workflows/terraform-snyk.yml
name: Terraform Security Scan with Snyk

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches: [main]

jobs:
  snyk-iac-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Run Snyk IaC test
      - name: Run Snyk IaC Scan
        uses: snyk/actions/iac@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          file: terraform/
          args: --severity-threshold=medium --report

      # Upload SARIF results to GitHub Security
      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif

  # Run Terraform only if Snyk passes
  terraform:
    needs: snyk-iac-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform
        run: terraform plan -out=tfplan

      # Scan the plan file too
      - name: Snyk Plan Scan
        uses: snyk/actions/iac@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          file: terraform/tfplan
          args: --severity-threshold=high

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        working-directory: terraform
        run: terraform apply -auto-approve tfplan
```

## Step 4: Custom Snyk Rules

Create custom rules for organization-specific requirements.

```yaml
# .snyk
# Snyk configuration file for the project

# Ignore specific issues globally
ignore:
  SNYK-CC-TF-73:
    - '*':
        reason: 'S3 bucket logging handled at organization level'
        expires: '2026-06-01'

# Custom severity overrides
patch: {}
```

```json
// .snyk.d/rules/custom-rules.json
// Custom Snyk IaC rules for the organization
{
  "rules": [
    {
      "id": "CUSTOM-001",
      "title": "EC2 instances must use IMDSv2",
      "description": "Instance Metadata Service v2 must be required",
      "severity": "high",
      "resource": "aws_instance",
      "path": "metadata_options.http_tokens",
      "expected": "required"
    },
    {
      "id": "CUSTOM-002",
      "title": "All resources must have cost center tag",
      "description": "Resources must include CostCenter tag for billing",
      "severity": "medium",
      "resource": "*",
      "path": "tags.CostCenter",
      "expected": "not_empty"
    }
  ]
}
```

## Step 5: Scanning Terraform Plan Output

Scan the Terraform plan for runtime security issues.

```bash
#!/bin/bash
# scan-plan.sh
# Scan Terraform plan output with Snyk

set -e

# Generate the plan
terraform plan -out=tfplan

# Convert to JSON for scanning
terraform show -json tfplan > tfplan.json

# Run Snyk on the plan
snyk iac test tfplan.json \
  --severity-threshold=high \
  --json > snyk-plan-results.json

# Check if any high or critical issues were found
HIGH_COUNT=$(jq '[.infrastructureAsCodeIssues[] | select(.severity == "high" or .severity == "critical")] | length' snyk-plan-results.json)

if [ "$HIGH_COUNT" -gt 0 ]; then
  echo "Found $HIGH_COUNT high/critical severity issues in the Terraform plan"
  jq '.infrastructureAsCodeIssues[] | select(.severity == "high" or .severity == "critical") | {title, severity, path}' snyk-plan-results.json
  exit 1
fi

echo "No high/critical issues found. Plan is safe to apply."
```

## Step 6: Snyk Integration with Terraform Cloud

If you use Terraform Cloud, integrate Snyk as a run task.

```hcl
# tfc-snyk.tf
# Configure Snyk as a Terraform Cloud run task
resource "tfe_organization_run_task" "snyk" {
  organization = var.tfe_organization
  url          = "https://api.snyk.io/v1/terraform-cloud/run-task"
  name         = "snyk-iac-scan"
  enabled      = true
  hmac_key     = var.snyk_run_task_hmac_key
}

# Associate the run task with a workspace
resource "tfe_workspace_run_task" "snyk" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.snyk.id
  enforcement_level = "mandatory"
  stage             = "post_plan"
}

# Define the workspace
resource "tfe_workspace" "production" {
  name         = "production"
  organization = var.tfe_organization
}
```

## Step 7: Monitoring and Reporting

Use Snyk's monitoring capabilities to track security posture over time.

```bash
# Monitor Terraform configurations for new issues
snyk iac test terraform/ --report

# Set up scheduled monitoring
snyk monitor --all-projects
```

```yaml
# Scheduled security scan
# .github/workflows/snyk-monitor.yml
name: Weekly Snyk Security Scan

on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8 AM

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Snyk Monitor
        uses: snyk/actions/iac@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: monitor
          args: --report
          file: terraform/
```

## Step 8: IDE Integration

Configure Snyk to scan Terraform files directly in your IDE.

For VS Code, install the Snyk extension and it will automatically scan Terraform files as you edit them. Snyk provides inline annotations showing security issues and suggested fixes, making it easy to address problems during development rather than in the CI pipeline.

## Best Practices

Run Snyk scans on every pull request to catch issues early. Use severity thresholds to distinguish between blocking and non-blocking issues. Create custom rules for organization-specific requirements that go beyond standard security checks. Scan both the Terraform configuration files and the plan output for comprehensive coverage. Use Snyk's reporting features to track security posture trends over time. Integrate with Terraform Cloud run tasks for seamless security gates. Review and update your Snyk ignore list regularly to ensure it remains current.

## Conclusion

Snyk provides a developer-friendly approach to Terraform security scanning. By integrating Snyk into your development workflow through IDE extensions, CLI scans, and CI/CD pipelines, you create multiple layers of security validation. This ensures that security issues are caught and fixed as early as possible in the development process, reducing the risk of misconfigurations reaching production. Combined with Snyk's continuous monitoring, you maintain ongoing visibility into your infrastructure's security posture.
