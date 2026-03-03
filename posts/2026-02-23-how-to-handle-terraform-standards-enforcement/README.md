# How to Handle Terraform Standards Enforcement

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Standard, Policy as Code, Compliance, DevOps

Description: Learn how to enforce Terraform coding standards, security policies, and organizational conventions automatically using policy-as-code tools, CI/CD integration, and custom validation rules.

---

Standards without enforcement are merely suggestions. When organizations define Terraform coding standards but rely on manual code reviews to catch violations, standards drift is inevitable. The solution is automated enforcement that catches violations early, provides clear feedback, and makes it easy for developers to do the right thing.

In this guide, we will cover how to implement comprehensive Terraform standards enforcement across your organization.

## Levels of Standards Enforcement

Standards enforcement should happen at multiple levels, creating layers of defense:

```text
Level 1: IDE/Editor     - Immediate feedback while writing code
Level 2: Pre-commit     - Catches issues before they enter version control
Level 3: CI Pipeline    - Validates against organizational policies
Level 4: Plan Review    - Checks actual planned changes against rules
Level 5: Apply Guard    - Final checks before changes are applied
```

## Level 1: IDE Integration

Start with the fastest feedback loop by configuring editors to show issues in real time:

```json
// .vscode/settings.json
// VS Code settings for Terraform standards enforcement
{
  "terraform.languageServer.enable": true,
  "terraform.validation.enableEnhancedValidation": true,
  "editor.formatOnSave": true,
  "[terraform]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "tflint.enable": true,
  "tflint.configPath": ".tflint.hcl"
}
```

## Level 2: Pre-commit Hooks

Catch formatting and basic issues before code enters the repository:

```yaml
# .pre-commit-config.yaml
# Pre-commit hooks for Terraform standards

repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.86.0
    hooks:
      # Format code consistently
      - id: terraform_fmt

      # Validate syntax
      - id: terraform_validate

      # Run tflint for best practices
      - id: terraform_tflint
        args:
          - '--args=--config=__GIT_WORKING_DIR__/.tflint.hcl'

      # Generate documentation
      - id: terraform_docs
        args:
          - '--args=--config=.terraform-docs.yml'

      # Security scanning
      - id: terraform_checkov
        args:
          - '--args=--config-file __GIT_WORKING_DIR__/.checkov.yml'

      # Check for sensitive data
      - id: detect_aws_credentials
      - id: detect_private_key
```

## Level 3: TFLint Configuration

Configure TFLint with your organization's specific rules:

```hcl
# .tflint.hcl
# TFLint configuration for organizational standards

config {
  # Enable all available plugins
  module = true
}

plugin "aws" {
  enabled = true
  version = "0.28.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Enforce naming conventions
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

# Require descriptions on all variables
rule "terraform_documented_variables" {
  enabled = true
}

# Require descriptions on all outputs
rule "terraform_documented_outputs" {
  enabled = true
}

# Require type declarations on variables
rule "terraform_typed_variables" {
  enabled = true
}

# Disallow deprecated syntax
rule "terraform_deprecated_interpolation" {
  enabled = true
}

# Require standard module structure
rule "terraform_standard_module_structure" {
  enabled = true
}

# AWS-specific rules
rule "aws_instance_invalid_type" {
  enabled = true
}

rule "aws_instance_previous_type" {
  enabled = true
}

# Prevent use of default VPC
rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Team", "Environment", "ManagedBy"]
}
```

## Level 4: OPA Policy Enforcement

Use Open Policy Agent for sophisticated policy checks against Terraform plans:

```rego
# policies/security/encryption.rego
# Enforce encryption on all supported resources

package terraform.security.encryption

# S3 buckets must have encryption enabled
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    resource.change.after.server_side_encryption_configuration == null
    msg := sprintf(
        "S3 bucket '%s' must have server-side encryption enabled",
        [resource.address]
    )
}

# EBS volumes must be encrypted
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    resource.change.after.encrypted != true
    msg := sprintf(
        "EBS volume '%s' must be encrypted",
        [resource.address]
    )
}

# RDS instances must be encrypted
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    resource.change.after.storage_encrypted != true
    msg := sprintf(
        "RDS instance '%s' must have storage encryption enabled",
        [resource.address]
    )
}
```

```rego
# policies/networking/security-groups.rego
# Enforce security group standards

package terraform.networking.security_groups

# No security group should allow 0.0.0.0/0 ingress on SSH
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group_rule"
    resource.change.after.type == "ingress"
    resource.change.after.from_port <= 22
    resource.change.after.to_port >= 22
    contains(resource.change.after.cidr_blocks[_], "0.0.0.0/0")
    msg := sprintf(
        "Security group rule '%s' allows SSH from 0.0.0.0/0. Use specific CIDR ranges.",
        [resource.address]
    )
}

# No security group should allow all traffic ingress
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group_rule"
    resource.change.after.type == "ingress"
    resource.change.after.from_port == 0
    resource.change.after.to_port == 65535
    resource.change.after.protocol == "-1"
    msg := sprintf(
        "Security group rule '%s' allows all traffic ingress. Be specific about ports and protocols.",
        [resource.address]
    )
}
```

## Level 5: Sentinel Policies for Terraform Cloud

If using Terraform Cloud or Enterprise, Sentinel provides native policy enforcement:

```python
# sentinel/require-tags.sentinel
# Enforce tagging standards on all resources

import "tfplan/v2" as tfplan

# Required tags for all resources
required_tags = ["Team", "Environment", "ManagedBy", "CostCenter"]

# Get all resources that support tags
taggable_resources = filter tfplan.resource_changes as _, rc {
    rc.change.after_unknown.tags_all is not undefined or
    rc.change.after.tags is not undefined
}

# Check each taggable resource has required tags
violations = []
for taggable_resources as address, rc {
    tags = rc.change.after.tags else {}
    for required_tags as required_tag {
        if required_tag not in tags {
            append(violations, address + " is missing tag: " + required_tag)
        }
    }
}

# Policy result
main = rule {
    length(violations) is 0
}
```

## CI Pipeline Integration

Integrate all enforcement checks into your CI pipeline:

```yaml
# .github/workflows/terraform-standards.yaml
name: Terraform Standards Enforcement

on:
  pull_request:
    paths: ['**/*.tf', '**/*.tfvars']

jobs:
  format-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Format
        run: terraform fmt -check -recursive -diff

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: TFLint
        run: |
          tflint --init
          tflint --recursive --format=compact

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Checkov Security Scan
        run: |
          checkov -d . --output cli --output junitxml \
            --output-file-path console,results.xml \
            --config-file .checkov.yml

  policy-check:
    runs-on: ubuntu-latest
    needs: [format-check, lint]
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      - name: OPA Policy Check
        run: |
          # Run all policies against the plan
          opa eval --data policies/ \
            --input plan.json \
            "data.terraform.security" \
            --fail-defined

      - name: Post Results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            // Post standards check results as PR comment
            const results = require('./standards-results.json');
            let body = '## Standards Check Results\n\n';

            for (const [check, result] of Object.entries(results)) {
              const icon = result.passed ? '✅' : '❌';
              body += `${icon} **${check}**: ${result.message}\n`;
            }

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });
```

## Handling Exceptions

No set of standards covers every case. Build a controlled exception process:

```hcl
# When a team needs to deviate from standards,
# they can use a documented exception

# checkov:skip=CKV_AWS_18:Access logging not needed for temp bucket
resource "aws_s3_bucket" "temp_data" {
  bucket = "myorg-temp-data-processing"

  tags = {
    Exception     = "INFRA-2024-001"
    ExceptionNote = "Temporary bucket, auto-deleted after 7 days"
    ExpiresOn     = "2026-03-23"
  }
}
```

```yaml
# exceptions/INFRA-2024-001.yaml
# Documented standards exception

id: INFRA-2024-001
title: "Skip access logging for temporary processing bucket"
requested_by: "alice@myorg.com"
approved_by: "security-team@myorg.com"
approved_date: "2026-02-20"
expires: "2026-03-23"
affected_resources:
  - "aws_s3_bucket.temp_data"
skipped_checks:
  - CKV_AWS_18  # S3 access logging
reason: >
  This bucket is used for temporary data processing and is
  automatically deleted after 7 days. The overhead of access
  logging is not justified for this short-lived resource.
```

## Measuring Standards Compliance

Track how well teams adhere to standards over time:

```python
# scripts/standards-metrics.py
# Track standards compliance metrics

def calculate_compliance_metrics(scan_results):
    """Calculate organization-wide standards compliance."""
    metrics = {
        "formatting": {
            "files_checked": 0,
            "files_compliant": 0,
            "rate": 0.0
        },
        "naming": {
            "resources_checked": 0,
            "resources_compliant": 0,
            "rate": 0.0
        },
        "security": {
            "checks_run": 0,
            "checks_passed": 0,
            "rate": 0.0
        },
        "tagging": {
            "resources_checked": 0,
            "resources_compliant": 0,
            "rate": 0.0
        },
        "documentation": {
            "modules_checked": 0,
            "modules_documented": 0,
            "rate": 0.0
        }
    }

    # Calculate compliance rates
    for category in metrics:
        checked = metrics[category]["files_checked"] or metrics[category].get("resources_checked", 0) or metrics[category].get("checks_run", 0) or metrics[category].get("modules_checked", 0)
        if checked > 0:
            compliant = metrics[category].get("files_compliant", 0) or metrics[category].get("resources_compliant", 0) or metrics[category].get("checks_passed", 0) or metrics[category].get("modules_documented", 0)
            metrics[category]["rate"] = round(compliant / checked * 100, 1)

    return metrics
```

## Best Practices

Enforce progressively. Start with warnings before turning checks into hard failures. Give teams time to bring existing code into compliance before blocking their deployments.

Provide clear error messages. Every failed check should include an explanation of what is wrong, why the standard exists, and how to fix it. A cryptic error message creates frustration, not compliance.

Keep standards up to date. Review and update your standards regularly as Terraform, cloud providers, and security best practices evolve.

Make compliance easy. If a standard is consistently hard to follow, consider whether the standard needs to change or whether better tooling is needed.

Automate everything. Manual enforcement does not scale. Invest in tooling that makes compliance checking automatic and fast.

## Conclusion

Effective Terraform standards enforcement combines multiple layers of automation, from IDE-level feedback to CI pipeline checks to runtime policy enforcement. The goal is to make it easy for developers to follow standards and difficult to accidentally violate them. By investing in comprehensive enforcement tooling, you create an environment where high-quality, secure, and consistent infrastructure is the default, not the exception.
