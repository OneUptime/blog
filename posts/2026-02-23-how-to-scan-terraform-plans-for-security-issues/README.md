# How to Scan Terraform Plans for Security Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Static Analysis, DevSecOps, Tfsec, Checkov

Description: Integrate security scanning into your Terraform workflow with tools like tfsec, Checkov, Trivy, and OPA to catch misconfigurations before they reach production.

---

Security scanning should happen before your Terraform code reaches production, not after. Static analysis tools can catch open security groups, unencrypted storage, missing logging, overly permissive IAM policies, and hundreds of other misconfigurations. Integrating these tools into your CI/CD pipeline means security issues get flagged at pull request time, when they are cheapest to fix.

This guide covers the most effective tools for scanning Terraform code and how to integrate them into your workflow.

## tfsec (now part of Trivy)

tfsec is one of the most popular Terraform security scanners. It has been integrated into Aqua Security's Trivy, but the standalone tfsec still works and is widely used.

### Installation and Basic Usage

```bash
# Install tfsec

brew install tfsec

# Or install Trivy (which includes tfsec functionality)
brew install trivy

# Scan a directory
tfsec .

# Scan with specific severity threshold
tfsec . --minimum-severity HIGH

# Output as JSON for CI/CD integration
tfsec . --format json --out results.json

# Using Trivy instead
trivy config .
trivy config --severity HIGH,CRITICAL .
```

### What tfsec Catches

tfsec checks for hundreds of security issues across AWS, Azure, and GCP. Here are some examples:

```hcl
# tfsec would flag this: S3 bucket without encryption
resource "aws_s3_bucket" "bad" {
  bucket = "my-bucket"
  # Missing: server-side encryption configuration
  # Missing: public access block
  # Missing: versioning
}

# tfsec would flag this: security group with open SSH
resource "aws_security_group_rule" "bad_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]  # Open to the world
  security_group_id = aws_security_group.example.id
}

# tfsec would flag this: RDS without encryption
resource "aws_db_instance" "bad" {
  engine         = "postgres"
  instance_class = "db.t3.micro"
  # Missing: storage_encrypted = true
  # Missing: backup_retention_period > 0
}
```

### Inline Ignores

When you need to suppress a finding (with justification):

```hcl
resource "aws_s3_bucket" "public_website" {
  bucket = "my-public-website"

  # Intentionally public static website
  #tfsec:ignore:aws-s3-no-public-buckets
}
```

## Checkov

Checkov by Bridgecrew/Palo Alto supports Terraform, CloudFormation, Kubernetes, and more. It has over 1,000 built-in checks.

```bash
# Install Checkov
pip install checkov

# Scan Terraform directory
checkov -d .

# Scan specific file
checkov -f main.tf

# Filter by framework
checkov -d . --framework terraform

# Scan a Terraform plan file
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json
checkov -f plan.json --framework terraform_plan

# Skip specific checks
checkov -d . --skip-check CKV_AWS_145,CKV_AWS_19

# Output SARIF for GitHub Security
checkov -d . --output sarif > results.sarif
```

### Custom Checkov Policies

Write custom checks in Python or YAML:

```yaml
# custom-checks/require-tags.yaml
metadata:
  id: "CKV2_CUSTOM_1"
  name: "Ensure all resources have required tags"
  category: "CONVENTION"
  severity: "MEDIUM"
definition:
  cond_type: "attribute"
  resource_types:
    - "aws_instance"
    - "aws_s3_bucket"
    - "aws_db_instance"
  attribute: "tags.Environment"
  operator: "exists"
```

```bash
# Run with custom checks
checkov -d . --external-checks-dir ./custom-checks
```

## OPA/Conftest for Policy as Code

Open Policy Agent lets you write custom policies in Rego:

```bash
# Install conftest
brew install conftest

# Create a policy directory
mkdir -p policy
```

Write Rego policies:

```rego
# policy/security.rego
package main

planned_change(resource) if {
  some action in resource.change.actions
  action == "create"
}

planned_change(resource) if {
  some action in resource.change.actions
  action == "update"
}

# Deny unencrypted S3 buckets
deny contains msg if {
  some resource in input.resource_changes
  planned_change(resource)
  resource.type == "aws_s3_bucket"
  not resource.change.after.server_side_encryption_configuration
  msg := sprintf("S3 bucket '%s' must have server-side encryption", [resource.address])
}

# Deny security groups with open SSH
deny contains msg if {
  some resource in input.resource_changes
  planned_change(resource)
  resource.type == "aws_security_group_rule"
  after := resource.change.after
  after.type == "ingress"
  after.from_port <= 22
  after.to_port >= 22
  after.protocol == "tcp"
  some cidr in after.cidr_blocks
  cidr == "0.0.0.0/0"
  msg := sprintf("Security group rule '%s' allows SSH from 0.0.0.0/0", [resource.address])
}

# Require specific tags on all resources
deny contains msg if {
  some resource in input.resource_changes
  planned_change(resource)
  resource.type in {"aws_instance", "aws_s3_bucket", "aws_db_instance"}
  required_tags := {"Environment", "Team", "ManagedBy"}
  provided_tags := {tag | resource.change.after.tags[tag]}
  missing := required_tags - provided_tags
  count(missing) > 0
  msg := sprintf("%s is missing required tags: %v", [resource.address, missing])
}

# Deny IAM policies with wildcard actions
deny contains msg if {
  some resource in input.resource_changes
  planned_change(resource)
  resource.type == "aws_iam_policy"
  policy := json.unmarshal(resource.change.after.policy)
  some statement in policy.Statement
  statement.Effect == "Allow"
  wildcard_action(statement.Action)
  msg := sprintf("IAM policy '%s' has wildcard Action", [resource.address])
}

wildcard_action(actions) if {
  is_string(actions)
  actions == "*"
}

wildcard_action(actions) if {
  is_array(actions)
  some action in actions
  action == "*"
}
```

Run the checks:

```bash
# Convert Terraform to JSON for conftest
terraform show -json plan.tfplan > plan.json

# Run conftest
conftest test plan.json

# Or write HCL-oriented policies and test HCL directly with a specific parser
conftest test --parser hcl2 *.tf
```

## Scanning Terraform Plan Output

Scanning the plan output catches issues that static analysis of HCL cannot, like computed values and module expansions:

```bash
#!/bin/bash
# scan-plan.sh - Comprehensive plan scanning

set -e

echo "=== Running Terraform Plan ==="
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json

echo ""
echo "=== Running tfsec ==="
tfsec . --minimum-severity MEDIUM || true

echo ""
echo "=== Running Checkov on Plan ==="
checkov -f plan.json --framework terraform_plan --compact || true

echo ""
echo "=== Running Conftest ==="
conftest test plan.json --policy policy/ || true

# Clean up
rm -f plan.tfplan plan.json

echo ""
echo "=== Scan Complete ==="
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Terraform Security Scan
on:
  pull_request:
    paths:
      - '**/*.tf'
      - '**/*.tfvars'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          soft_fail: false
          additional_args: --minimum-severity HIGH

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          output_format: sarif
          output_file_path: checkov-results.sarif
          soft_fail: false

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: checkov-results.sarif

      - name: Run Trivy
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          scan-type: config
          scan-ref: .
          severity: HIGH,CRITICAL
          exit-code: '1'
```

### GitLab CI

```yaml
security-scan:
  stage: validate
  image: python:3.11
  before_script:
    - pip install checkov
    - curl -L -o tfsec https://github.com/aquasecurity/tfsec/releases/latest/download/tfsec-linux-amd64
    - chmod +x tfsec && mv tfsec /usr/local/bin/
  script:
    - tfsec . --minimum-severity HIGH --format junit > tfsec-results.xml
    - checkov -d . --framework terraform --output junitxml > checkov-results.xml
  artifacts:
    reports:
      junit:
        - tfsec-results.xml
        - checkov-results.xml
  rules:
    - changes:
        - "**/*.tf"
```

## Managing False Positives

Every scanning tool produces false positives. Handle them systematically:

```hcl
# .tfsec/config.yml
severity_overrides:
  aws-s3-specify-public-access-block: LOW  # Handled by SCP

exclude:
  # Intentionally public static website bucket
  - aws-s3-no-public-access-with-acl:2026-12-31

# .checkov.yaml
skip-check:
  - CKV_AWS_145  # S3 default encryption handled by SCP
  - CKV_AWS_18   # S3 access logging handled by CloudTrail data events
```

## Summary

Security scanning for Terraform should be a mandatory step in your CI/CD pipeline. Use tfsec or Trivy for fast static analysis, Checkov for comprehensive compliance checking, and OPA/conftest for custom organizational policies. Scan both the HCL source code and the plan output for maximum coverage. The goal is to catch security issues at pull request time, before they ever touch your production infrastructure.

For more on Terraform security, see [how to implement CIS Benchmarks with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cis-benchmarks-with-terraform/view) and [how to handle Terraform drift as a security concern](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-drift-as-a-security-concern/view).
