# How to Integrate Terraform with Compliance Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Compliance, Security, DevOps, Infrastructure as Code, Governance, Policy as Code

Description: Learn how to integrate Terraform with compliance tools like OPA, Sentinel, and Checkov to enforce security policies and regulatory requirements in your infrastructure code.

---

Compliance is a critical concern for organizations deploying cloud infrastructure. Integrating compliance tools into your Terraform workflow ensures that infrastructure changes meet security standards and regulatory requirements before they are applied. This guide covers multiple compliance tools and how to integrate them with Terraform for policy-as-code enforcement.

## Why Integrate Compliance Tools with Terraform?

Without compliance checks, Terraform can deploy any configuration a developer writes, including configurations that violate security best practices or regulatory requirements. Compliance integration adds guardrails that prevent non-compliant infrastructure from being provisioned. This shifts compliance left in the development process, catching issues before they reach production rather than during an audit.

Common compliance requirements include encryption at rest and in transit, network access restrictions, logging and monitoring enabled, resource tagging standards, identity and access management policies, and data residency rules.

## Prerequisites

You need Terraform version 1.0 or later, one or more compliance tools installed, a CI/CD pipeline, and familiarity with your organization's compliance requirements.

## Method 1: HashiCorp Sentinel (Terraform Enterprise/Cloud)

Sentinel is HashiCorp's policy-as-code framework built for Terraform Enterprise and Cloud.

```hcl
# sentinel/policies/require-encryption.sentinel
# Sentinel policy requiring encryption on all storage resources

import "tfplan/v2" as tfplan

# Get all S3 buckets being created or modified
s3_buckets = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_s3_bucket" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check that server-side encryption is enabled
require_encryption = rule {
  all s3_buckets as _, bucket {
    bucket.change.after.server_side_encryption_configuration is not null
  }
}

# Check that versioning is enabled
require_versioning = rule {
  all s3_buckets as _, bucket {
    bucket.change.after.versioning[0].enabled is true
  }
}

# Main rule combining all checks
main = rule {
  require_encryption and require_versioning
}
```

```hcl
# sentinel/policies/restrict-instance-types.sentinel
# Policy restricting allowed EC2 instance types

import "tfplan/v2" as tfplan

# Define allowed instance types
allowed_instance_types = [
  "t3.micro", "t3.small", "t3.medium", "t3.large",
  "m5.large", "m5.xlarge",
]

# Get all EC2 instances
ec2_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check instance types
instance_type_allowed = rule {
  all ec2_instances as _, instance {
    instance.change.after.instance_type in allowed_instance_types
  }
}

main = rule {
  instance_type_allowed
}
```

```hcl
# sentinel/sentinel.hcl
# Sentinel configuration file defining policy sets

policy "require-encryption" {
  source            = "./policies/require-encryption.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "restrict-instance-types" {
  source            = "./policies/restrict-instance-types.sentinel"
  enforcement_level = "soft-mandatory"
}

policy "require-tags" {
  source            = "./policies/require-tags.sentinel"
  enforcement_level = "hard-mandatory"
}
```

## Method 2: Open Policy Agent (OPA) with Conftest

OPA is an open-source policy engine that works with any Terraform workflow.

```rego
# policies/terraform/require_tags.rego
# OPA policy requiring specific tags on all resources

package terraform.tags

import input as tfplan

# Define required tags
required_tags := {"Environment", "Owner", "ManagedBy", "CostCenter"}

# Get all resources from the plan
resources := tfplan.resource_changes

# Check for missing tags on each resource
deny[msg] {
  resource := resources[_]
  resource.change.actions[_] == "create"

  # Check if the resource supports tags
  tags := object.get(resource.change.after, "tags", {})

  # Find missing required tags
  missing := required_tags - {tag | tags[tag]}
  count(missing) > 0

  msg := sprintf(
    "Resource %s is missing required tags: %v",
    [resource.address, missing]
  )
}
```

```rego
# policies/terraform/security.rego
# OPA policy enforcing security best practices

package terraform.security

import input as tfplan

# Deny public S3 buckets
deny[msg] {
  resource := tfplan.resource_changes[_]
  resource.type == "aws_s3_bucket_acl"
  resource.change.after.acl == "public-read"

  msg := sprintf(
    "S3 bucket ACL %s must not be public-read",
    [resource.address]
  )
}

# Deny unencrypted RDS instances
deny[msg] {
  resource := tfplan.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.actions[_] == "create"
  not resource.change.after.storage_encrypted

  msg := sprintf(
    "RDS instance %s must have encryption enabled",
    [resource.address]
  )
}

# Deny security groups with unrestricted ingress
deny[msg] {
  resource := tfplan.resource_changes[_]
  resource.type == "aws_security_group_rule"
  resource.change.actions[_] == "create"
  resource.change.after.type == "ingress"

  cidr := resource.change.after.cidr_blocks[_]
  cidr == "0.0.0.0/0"
  resource.change.after.from_port != 443
  resource.change.after.from_port != 80

  msg := sprintf(
    "Security group rule %s allows unrestricted access on port %d",
    [resource.address, resource.change.after.from_port]
  )
}
```

Run OPA checks in your pipeline:

```yaml
# .github/workflows/terraform-compliance.yml
name: Terraform with Compliance Checks

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - uses: open-policy-agent/setup-opa@v2

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Terraform Plan (JSON)
        working-directory: terraform
        run: |
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      # Run OPA policy checks
      - name: Check Compliance Policies
        run: |
          opa eval \
            --input terraform/tfplan.json \
            --data policies/terraform/ \
            --format pretty \
            "data.terraform.tags.deny" | tee tag-results.txt

          opa eval \
            --input terraform/tfplan.json \
            --data policies/terraform/ \
            --format pretty \
            "data.terraform.security.deny" | tee security-results.txt

      # Alternatively use conftest for easier integration
      - name: Run Conftest
        run: |
          conftest test terraform/tfplan.json \
            --policy policies/terraform/ \
            --output table
```

## Method 3: Checkov for Static Analysis

Checkov is a static analysis tool specifically designed for infrastructure as code.

```yaml
# .github/workflows/checkov.yml
name: Terraform Checkov Compliance

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Run Checkov on Terraform files
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: results.sarif
          # Skip specific checks if needed
          skip_check: CKV_AWS_18,CKV_AWS_21
          # Set soft fail for non-blocking checks
          soft_fail: false
          # Check against specific compliance frameworks
          check: CKV_AWS_145,CKV_AWS_144,CKV_AWS_19

      # Upload results to GitHub Security tab
      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: results.sarif
```

Create a custom Checkov policy:

```python
# custom_checks/require_encryption.py
# Custom Checkov check requiring encryption on EBS volumes

from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RequireEBSEncryption(BaseResourceCheck):
    def __init__(self):
        name = "Ensure EBS volumes are encrypted"
        id = "CUSTOM_AWS_001"
        supported_resources = ["aws_ebs_volume"]
        categories = [CheckCategories.ENCRYPTION]
        super().__init__(
            name=name,
            id=id,
            categories=categories,
            supported_resources=supported_resources,
        )

    def scan_resource_conf(self, conf):
        # Check if encryption is enabled
        encrypted = conf.get("encrypted", [False])
        if isinstance(encrypted, list):
            encrypted = encrypted[0]

        if encrypted:
            return CheckResult.PASSED
        return CheckResult.FAILED

# Register the check
check = RequireEBSEncryption()
```

## Method 4: Terraform Compliance (BDD Style)

terraform-compliance lets you write compliance tests in a BDD (Given-When-Then) style.

```gherkin
# compliance/encryption.feature
# BDD-style compliance tests for encryption requirements

Feature: Encryption Compliance
  All storage and database resources must have encryption enabled

  Scenario: S3 buckets must be encrypted
    Given I have aws_s3_bucket defined
    Then it must have server_side_encryption_configuration

  Scenario: RDS instances must be encrypted
    Given I have aws_db_instance defined
    Then it must have storage_encrypted
    And its value must be true

  Scenario: EBS volumes must be encrypted
    Given I have aws_ebs_volume defined
    Then it must have encrypted
    And its value must be true
```

```gherkin
# compliance/tagging.feature
# BDD-style compliance tests for tagging standards

Feature: Resource Tagging
  All resources must have required tags

  Scenario: Resources must have Environment tag
    Given I have resource that supports tags defined
    Then it must have tags
    And it must contain Environment

  Scenario: Resources must have Owner tag
    Given I have resource that supports tags defined
    Then it must have tags
    And it must contain Owner

  Scenario: Resources must have ManagedBy tag
    Given I have resource that supports tags defined
    Then it must have tags
    And it must contain ManagedBy
```

```yaml
# Run terraform-compliance in the pipeline
- name: Run Terraform Compliance
  run: |
    terraform plan -out=tfplan
    terraform show -json tfplan > tfplan.json
    terraform-compliance -f compliance/ -p tfplan.json
```

## Method 5: Regula for Multi-Framework Compliance

Regula maps infrastructure configurations to compliance frameworks like CIS, SOC2, and HIPAA.

```yaml
# .github/workflows/regula.yml
- name: Run Regula
  run: |
    regula run terraform/ \
      --format table \
      --severity high \
      --input-type tf-plan \
      --include CIS_AWS \
      --include SOC2
```

## Integrating Multiple Tools

A comprehensive compliance pipeline often uses multiple tools together.

```yaml
# .github/workflows/full-compliance.yml
name: Full Compliance Pipeline

on:
  pull_request:

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        run: |
          cd terraform
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      # Static analysis with Checkov
      - name: Checkov Scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/

      # Policy checks with OPA
      - name: OPA Policy Check
        run: |
          conftest test terraform/tfplan.json \
            --policy policies/ \
            --output table

      # BDD compliance tests
      - name: Terraform Compliance
        run: |
          terraform-compliance \
            -f compliance/ \
            -p terraform/tfplan.json

      # Summary comment on PR
      - name: Post Compliance Summary
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: 'Compliance scan completed. Check the Actions tab for details.'
            })
```

## Best Practices

Run compliance checks on every pull request before Terraform plans are approved. Use hard-mandatory policies for critical security requirements and soft-mandatory for recommendations. Maintain a library of compliance policies versioned alongside your Terraform modules. Test compliance policies against known-good and known-bad configurations. Map your policies to specific compliance frameworks like CIS, SOC2, or HIPAA for audit purposes. Provide clear error messages in policy denials so developers know how to fix issues. Start with a small set of critical policies and expand gradually to avoid overwhelming teams.

## Conclusion

Integrating compliance tools with Terraform is essential for organizations that need to meet regulatory requirements and maintain security standards. Whether you use Sentinel, OPA, Checkov, terraform-compliance, or a combination, the key is to automate compliance checks as part of your infrastructure delivery pipeline. This ensures that every infrastructure change is validated against your policies before it reaches production, reducing risk and making audit processes smoother.
