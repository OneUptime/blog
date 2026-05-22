# How to Use Terraform with Prisma Cloud for Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Prisma Cloud, Security, DevOps, Infrastructure as Code, Cloud Security, CSPM

Description: Learn how to integrate Terraform with Prisma Cloud to scan infrastructure code for security misconfigurations and enforce cloud security policies across your deployments.

---

Prisma Cloud by Palo Alto Networks is a comprehensive cloud security platform that provides cloud security posture management (CSPM), cloud workload protection, and infrastructure as code security scanning. Integrating Prisma Cloud with Terraform allows you to scan your infrastructure code for security issues before deployment and continuously monitor your cloud resources for security misconfigurations. This guide covers how to set up this integration.

## Why Use Prisma Cloud with Terraform?

Prisma Cloud provides several capabilities that enhance Terraform security. Its IaC scanning engine (powered by Checkov) can analyze Terraform configurations against hundreds of built-in policies. The platform maps findings to compliance frameworks like CIS, NIST, PCI-DSS, HIPAA, and SOC2. It also provides a centralized dashboard for tracking security posture across all your Terraform-managed infrastructure.

Key benefits include pre-deployment scanning of Terraform code, real-time monitoring of deployed resources, drift detection with Terraform or HCP Terraform, supply chain security for Terraform modules, and centralized policy management across multiple cloud accounts.

## Prerequisites

You need a Prisma Cloud Enterprise account, a Prisma Cloud access key and secret key, Checkov installed, Terraform version 1.0 or later, and cloud provider accounts onboarded to Prisma Cloud.

## Step 1: Configure Prisma Cloud for IaC Scanning

Set up Checkov for Prisma Cloud Terraform scanning.

```bash
# Install Checkov, the CLI used by Prisma Cloud Application Security

pip install checkov

# Authenticate with Prisma Cloud
# Use the API URL for your Prisma Cloud tenant
export PRISMA_API_URL="https://api.prismacloud.io"
export BC_API_KEY="your-prisma-cloud-access-key::your-prisma-cloud-secret-key"
```

## Step 2: Scan Terraform Configurations

Run Prisma Cloud's scanning engine against your Terraform code.

```bash
# Scan all Terraform files in a directory
checkov -d terraform/ --bc-api-key $BC_API_KEY --repo-id org/repo

# Scan with specific severities or Checkov policy IDs
checkov -d terraform/ --framework terraform --check HIGH,CRITICAL

# Scan and output results in different formats
checkov -d terraform/ --output sarif --output-file-path results.sarif
checkov -d terraform/ --output json --output-file-path results.json

# Scan a Terraform plan file
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
checkov -f tfplan.json --framework terraform_plan
```

## Step 3: CI/CD Integration with Prisma Cloud

Integrate Prisma Cloud scanning into your CI/CD pipeline.

```yaml
# .github/workflows/prisma-cloud-terraform.yml
name: Terraform with Prisma Cloud Security

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches: [main]

jobs:
  prisma-cloud-scan:
    runs-on: ubuntu-latest
    name: Prisma Cloud IaC Scan
    steps:
      - uses: actions/checkout@v4

      # Run Prisma Cloud IaC scan
      - name: Run Checkov (Prisma Cloud)
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          api-key: ${{ secrets.BC_API_KEY }}
          prisma-api-url: ${{ secrets.PRISMA_API_URL }}
          framework: terraform
          output_format: sarif
          output_file_path: prisma-results.sarif
          # Only fail on high and critical severity
          soft_fail_on: LOW,MEDIUM
          # Compact output for PR comments
          compact: true

      # Upload SARIF to GitHub Security
      - name: Upload SARIF Results
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: prisma-results.sarif

  terraform:
    needs: prisma-cloud-scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Install Checkov
        run: pip install checkov

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform
        run: terraform plan -out=tfplan

      # Scan the plan output with Prisma Cloud
      - name: Scan Terraform Plan
        run: |
          cd terraform
          terraform show -json tfplan > tfplan.json
          checkov -f tfplan.json \
            --framework terraform_plan \
            --bc-api-key ${{ secrets.BC_API_KEY }} \
            --prisma-api-url ${{ secrets.PRISMA_API_URL }}

      - name: Terraform Apply
        working-directory: terraform
        run: terraform apply -auto-approve tfplan
```

## Step 4: Custom Policies in Prisma Cloud

Create organization-specific policies using Prisma Cloud's policy editor.

```python
# custom_policies/require_imdsv2.py
# Custom Prisma Cloud policy requiring IMDSv2 on EC2 instances

from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RequireIMDSv2(BaseResourceCheck):
    def __init__(self):
        name = "Ensure EC2 instances require IMDSv2"
        id = "CKV_CUSTOM_AWS_001"
        supported_resources = ["aws_instance", "aws_launch_template"]
        categories = [CheckCategories.GENERAL_SECURITY]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_resources=supported_resources,
        )

    def scan_resource_conf(self, conf):
        metadata_options = conf.get("metadata_options", [{}])
        if isinstance(metadata_options, list):
            metadata_options = metadata_options[0] if metadata_options else {}

        http_tokens = metadata_options.get("http_tokens", ["optional"])
        if isinstance(http_tokens, list):
            http_tokens = http_tokens[0]

        if http_tokens == "required":
            return CheckResult.PASSED
        return CheckResult.FAILED

check = RequireIMDSv2()
```

```yaml
# custom_policies/require_vpc_flow_logs.yaml
# Custom policy ensuring VPCs have flow logs enabled

metadata:
  id: "CKV2_CUSTOM_AWS_002"
  name: "Ensure VPC has flow logs enabled"
  category: "LOGGING"

definition:
  cond_type: "connection"
  resource_types:
    - "aws_vpc"
  connected_resource_types:
    - "aws_flow_log"
  operator: "exists"
```

## Step 5: Manage Prisma Cloud with Terraform

Use the Prisma Cloud Terraform provider to manage the platform itself.

```hcl
# prisma-cloud-management.tf
# Manage Prisma Cloud configuration with Terraform
terraform {
  required_providers {
    prismacloud = {
      source  = "PaloAltoNetworks/prismacloud"
      version = "~> 1.7"
    }
  }
}

provider "prismacloud" {
  json_config_file = var.prisma_cloud_config_path
}

# Create an alert rule for Terraform-related findings
resource "prismacloud_alert_rule" "terraform_iac" {
  name        = "Terraform IaC Security Alerts"
  description = "Alerts for security issues found in Terraform configurations"
  enabled     = true

  target {
    account_groups = [prismacloud_account_group.production.group_id]
  }

  notification_config {
    config_type       = "slack"
    detailed_report   = true
    with_compression  = false
    frequency         = "as_it_happens"
  }

  policies = [
    prismacloud_policy.restrict_public_access.policy_id,
  ]
}

# Create custom policies
resource "prismacloud_policy" "restrict_public_access" {
  name        = "Restrict Public S3 Access"
  policy_type = "config"
  cloud_type  = "aws"
  severity    = "high"
  description = "Detects S3 buckets that allow public access"
  enabled     = true

  rule {
    name      = "restrict-public-s3-access"
    rule_type = "Config"
    parameters = {
      savedSearch = false
      withIac     = false
    }

    criteria = "config from cloud.resource where cloud.type = 'aws' AND api.name = 'aws-s3api-get-bucket-acl' AND json.rule = \"acl.grants[?(@.grantee=='AllUsers')] size > 0 or policyStatus.isPublic is true\""
  }
}

# Create an account group for Terraform-managed accounts
resource "prismacloud_account_group" "production" {
  name        = "Production Accounts"
  description = "Production cloud accounts managed by Terraform"
}

# Onboard an AWS account
resource "prismacloud_cloud_account_v2" "production_aws" {
  aws {
    account_id   = var.aws_account_id
    enabled      = true
    group_ids    = [prismacloud_account_group.production.group_id]
    name         = "Production AWS"
    role_arn     = "arn:aws:iam::${var.aws_account_id}:role/PrismaCloudRole"
  }
}
```

## Step 6: Terraform Cloud Run Task Integration

Integrate Prisma Cloud as a Terraform Cloud run task.

```hcl
# tfc-prisma-integration.tf
# Set up Prisma Cloud as a Terraform Cloud run task
resource "tfe_organization_run_task" "prisma_cloud" {
  organization = var.tfe_organization
  url          = "${var.prisma_api_url}/bridgecrew/api/v1/tfCloud/runTasks"
  name         = "prisma-cloud-iac-scan"
  enabled      = true
  hmac_key     = var.prisma_run_task_hmac_key
}

# Associate with workspaces
resource "tfe_workspace_run_task" "prisma_production" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.prisma_cloud.id
  enforcement_level = "mandatory"
  stages            = ["post_plan"]
}

resource "tfe_workspace_run_task" "prisma_staging" {
  workspace_id      = tfe_workspace.staging.id
  task_id           = tfe_organization_run_task.prisma_cloud.id
  enforcement_level = "advisory"
  stages            = ["post_plan"]
}
```

## Step 7: Drift Detection

Use Terraform or HCP Terraform to detect drift between Terraform state and actual cloud configuration, and use Prisma Cloud alerts to monitor security-relevant cloud configuration changes.

```hcl
# drift-detection.tf
# Set up resources that Terraform can check for drift and Prisma Cloud can monitor for configuration changes

# Tag resources to identify Terraform-managed infrastructure
locals {
  common_tags = {
    ManagedBy       = "terraform"
    TerraformModule = "production-infrastructure"
    DriftMonitored  = "true"
  }
}

# Apply tags to all resources
resource "aws_s3_bucket" "example" {
  bucket = "monitored-bucket"
  tags   = local.common_tags
}

resource "aws_security_group" "example" {
  name   = "monitored-sg"
  vpc_id = var.vpc_id
  tags   = local.common_tags

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
}
```

When Terraform or HCP Terraform detects that someone has modified these resources outside of Terraform (for example, adding a new ingress rule to the security group through the AWS console), it reports drift in a plan. Prisma Cloud can separately generate alerts when those manual changes violate monitored cloud security policies. This helps enforce that all changes go through the Terraform workflow.

## Best Practices

Integrate Prisma Cloud scanning into both pre-commit hooks and CI/CD pipelines for comprehensive coverage. Use the Prisma Cloud dashboard to track security posture trends over time. Map policies to specific compliance frameworks for audit purposes. Create suppression rules for known acceptable deviations rather than disabling checks entirely. Use Terraform or HCP Terraform drift detection to ensure manual changes are reconciled back into Terraform. Onboard all cloud accounts to Prisma Cloud for unified visibility. Review the Prisma Cloud severity levels and adjust them to match your organization's risk appetite.

## Conclusion

Prisma Cloud provides enterprise-grade security for Terraform deployments. Its combination of pre-deployment IaC scanning, runtime monitoring, and Terraform drift detection creates a comprehensive security posture for infrastructure as code. By integrating Prisma Cloud into your Terraform workflow, you ensure that security is validated at every stage from code to cloud, with centralized visibility and compliance reporting.
