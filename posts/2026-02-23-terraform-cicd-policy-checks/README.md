# How to Implement Terraform CI/CD with Policy Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Policy as Code, OPA, Sentinel, Security, DevOps

Description: Add automated policy checks to your Terraform CI/CD pipelines using OPA, Sentinel, tfsec, and custom scripts to enforce security, compliance, and organizational standards.

---

Policy checks in Terraform CI/CD pipelines act as automated guardrails. They enforce rules like "all S3 buckets must be encrypted" or "no public security group rules" before changes reach production. Instead of relying on reviewers to catch every compliance violation, you codify the rules and let the pipeline enforce them.

This post covers the major approaches to policy checking in Terraform CI/CD.

## The Policy Check Landscape

There are several tools for Terraform policy enforcement:

- **OPA (Open Policy Agent)** with Rego - open source, cloud agnostic
- **Sentinel** - HashiCorp's policy framework for Terraform Cloud/Enterprise
- **tfsec/trivy** - security-focused scanning
- **Checkov** - policy-as-code with hundreds of built-in checks
- **Custom scripts** - parsing the plan JSON directly

## Open Policy Agent (OPA)

OPA is the most flexible option. You write policies in the Rego language and evaluate them against the Terraform plan JSON.

### Setting Up OPA in CI/CD

```yaml
# .github/workflows/terraform-policy.yml
name: Terraform with Policy Checks
on:
  pull_request:
    paths: ['infrastructure/**']

jobs:
  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Plan
        working-directory: infrastructure
        run: |
          terraform init
          terraform plan -out=tfplan -no-color
          terraform show -json tfplan > plan.json

      # Install OPA
      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/v0.62.0/opa_linux_amd64_static
          chmod +x opa
          sudo mv opa /usr/local/bin/

      # Run policy checks
      - name: Evaluate Policies
        run: |
          # Run all policies and collect results
          FAILURES=0

          for POLICY_FILE in policies/*.rego; do
            echo "Evaluating: $POLICY_FILE"

            # Check for deny rules
            DENIES=$(opa eval \
              --input infrastructure/plan.json \
              --data "$POLICY_FILE" \
              --format json \
              'data.terraform.deny' | jq -r '.result[0].expressions[0].value[]')

            if [ -n "$DENIES" ]; then
              echo "POLICY VIOLATION in $POLICY_FILE:"
              echo "$DENIES"
              FAILURES=$((FAILURES + 1))
            else
              echo "PASSED: $POLICY_FILE"
            fi
          done

          if [ "$FAILURES" -gt 0 ]; then
            echo "ERROR: $FAILURES policy violations found"
            exit 1
          fi

          echo "All policies passed"
```

### Writing OPA Policies

```rego
# policies/encryption.rego
package terraform

# Deny unencrypted S3 buckets
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    resource.change.actions[_] == "create"

    # Check if encryption configuration exists
    not resource.change.after.server_side_encryption_configuration
    msg := sprintf("S3 bucket '%s' must have encryption enabled", [resource.address])
}

# Deny unencrypted RDS instances
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    resource.change.actions[_] == "create"
    resource.change.after.storage_encrypted == false

    msg := sprintf("RDS instance '%s' must have storage encryption enabled", [resource.address])
}

# Deny unencrypted EBS volumes
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    resource.change.actions[_] == "create"
    resource.change.after.encrypted == false

    msg := sprintf("EBS volume '%s' must be encrypted", [resource.address])
}
```

```rego
# policies/networking.rego
package terraform

# Deny security groups with 0.0.0.0/0 ingress
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group_rule"
    resource.change.actions[_] == "create"
    resource.change.after.type == "ingress"

    cidr := resource.change.after.cidr_blocks[_]
    cidr == "0.0.0.0/0"

    # Exclude port 443 (HTTPS) from the check
    resource.change.after.from_port != 443

    msg := sprintf(
        "Security group rule '%s' allows ingress from 0.0.0.0/0 on port %d. Only port 443 is allowed.",
        [resource.address, resource.change.after.from_port]
    )
}

# Deny public subnets without explicit approval tag
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_subnet"
    resource.change.actions[_] == "create"
    resource.change.after.map_public_ip_on_launch == true

    not resource.change.after.tags["PublicSubnetApproved"]
    msg := sprintf("Public subnet '%s' requires 'PublicSubnetApproved' tag", [resource.address])
}
```

```rego
# policies/tagging.rego
package terraform

# Required tags for all taggable resources
required_tags := {"Environment", "Team", "CostCenter", "ManagedBy"}

# Resources that support tags
taggable_types := {
    "aws_instance", "aws_s3_bucket", "aws_db_instance",
    "aws_ecs_service", "aws_lambda_function", "aws_vpc"
}

deny[msg] {
    resource := input.resource_changes[_]
    taggable_types[resource.type]
    resource.change.actions[_] == "create"

    # Find missing tags
    existing_tags := {tag | resource.change.after.tags[tag]}
    missing := required_tags - existing_tags

    count(missing) > 0
    msg := sprintf(
        "Resource '%s' is missing required tags: %v",
        [resource.address, missing]
    )
}
```

## Checkov Integration

Checkov provides hundreds of built-in policy checks:

```yaml
- name: Run Checkov
  uses: bridgecrewio/checkov-action@v12
  with:
    directory: infrastructure
    framework: terraform
    output_format: cli
    soft_fail: false
    # Skip specific checks if needed
    skip_check: CKV_AWS_145  # Skip specific check ID
    # Only run specific checks
    # check: CKV_AWS_18,CKV_AWS_21
```

Create custom Checkov policies in Python:

```python
# policies/custom_checks/require_backup.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RequireRDSBackup(BaseResourceCheck):
    def __init__(self):
        name = "Ensure RDS instances have backup enabled"
        id = "CUSTOM_RDS_001"
        supported_resources = ["aws_db_instance"]
        categories = [CheckCategories.BACKUP_AND_RECOVERY]
        super().__init__(name=name, id=id, categories=categories,
                        supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        # Check backup_retention_period is set and > 0
        retention = conf.get("backup_retention_period", [0])
        if isinstance(retention, list):
            retention = retention[0]

        if retention and int(retention) >= 7:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = RequireRDSBackup()
```

## tfsec / Trivy Security Scanning

```yaml
- name: Run Trivy for Terraform
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: config
    scan-ref: infrastructure
    exit-code: 1
    severity: HIGH,CRITICAL
    # Ignore specific rules
    trivyignores: .trivyignore
```

Ignore specific findings when needed:

```text
# .trivyignore
# Allow specific public bucket for static website
AVD-AWS-0088
# Allow wider CIDR for development VPC
AVD-AWS-0102
```

## Sentinel (Terraform Cloud/Enterprise)

If you use Terraform Cloud, Sentinel policies run automatically:

```hcl
# sentinel/require-encryption.sentinel
import "tfplan/v2" as tfplan

# Find all S3 buckets being created
s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check encryption configuration
encryption_check = rule {
    all s3_buckets as _, bucket {
        bucket.change.after.server_side_encryption_configuration is not null
    }
}

# Main rule
main = rule {
    encryption_check
}
```

Configure Sentinel in `sentinel.hcl`:

```hcl
# sentinel.hcl
policy "require-encryption" {
    source            = "./require-encryption.sentinel"
    enforcement_level = "hard-mandatory"  # Cannot be overridden
}

policy "require-tags" {
    source            = "./require-tags.sentinel"
    enforcement_level = "soft-mandatory"  # Can be overridden with approval
}

policy "cost-limit" {
    source            = "./cost-limit.sentinel"
    enforcement_level = "advisory"  # Warning only
}
```

## Combining Multiple Policy Tools

Run different policy tools in a single pipeline for defense in depth:

```yaml
jobs:
  policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Plan
        working-directory: infrastructure
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      # Layer 1: Security scanning
      - name: Security Scan (tfsec)
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: infrastructure

      # Layer 2: Compliance checks
      - name: Compliance Check (Checkov)
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: infrastructure

      # Layer 3: Custom organization policies
      - name: Organization Policies (OPA)
        run: |
          opa eval --input infrastructure/plan.json \
            --data policies/ \
            --format json \
            'data.terraform.deny'

      # Layer 4: Cost policies
      - name: Cost Policy Check
        run: |
          infracost breakdown --path infrastructure/plan.json --format json > /tmp/cost.json
          opa eval --input /tmp/cost.json \
            --data policies/cost.rego \
            'data.terraform.cost.deny'
```

## Summary

Policy checks in Terraform CI/CD give you:

1. OPA/Rego for flexible, custom policy enforcement
2. Checkov for hundreds of built-in security and compliance checks
3. tfsec/Trivy for focused security scanning
4. Sentinel for Terraform Cloud/Enterprise native policy enforcement
5. Layered checking by combining multiple tools for defense in depth

Start with one tool - Checkov is the easiest to get running since it has built-in checks that work out of the box. Then add OPA when you need custom policies specific to your organization. The goal is catching policy violations at PR time rather than in a security audit months later. For the complete CI/CD pipeline setup, see [Terraform CI/CD security best practices](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-security-best-practices/view).
