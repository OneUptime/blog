# How to Handle Terraform Drift as a Security Concern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Drift Detection, DevOps, Compliance

Description: Treat Terraform state drift as a security risk and learn how to detect, alert on, and remediate configuration drift that could create security vulnerabilities.

---

Terraform drift happens when the actual state of your infrastructure diverges from what Terraform expects. Someone opens a port in a security group through the console. An IAM policy gets modified manually during an incident. A bucket policy changes and nobody updates the code. In most discussions, drift is treated as an operational inconvenience. But it is also a security concern, because drift means your actual security posture does not match your documented and reviewed security posture.

This guide covers how to detect drift, why specific types of drift are security-critical, and how to build automated workflows that catch and remediate drift before it becomes a problem.

## Why Drift Is a Security Problem

Consider this scenario: your Terraform code defines a security group that only allows port 443 from specific CIDR ranges. During an incident, an engineer opens port 22 from 0.0.0.0/0 through the AWS Console. The incident gets resolved, but nobody closes the port. Your Terraform code still shows the restricted rules, but the actual infrastructure has SSH open to the world.

This is not hypothetical. It happens regularly. The gap between what your code says and what actually exists is a gap in your security controls.

Security-critical resources that are prone to drift include:

- Security groups and NACLs
- IAM policies and role trust relationships
- S3 bucket policies and public access settings
- KMS key policies
- CloudTrail and logging configurations
- VPC route tables

## Detecting Drift with Terraform Plan

The simplest way to detect drift is to run `terraform plan` regularly:

```bash
#!/bin/bash
# drift-check.sh - Run drift detection and alert on changes

# Run plan in machine-readable format
terraform plan -detailed-exitcode -out=drift-check.plan 2>&1

EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "No drift detected"
    ;;
  1)
    echo "ERROR: Terraform plan failed"
    # Alert the team
    ;;
  2)
    echo "DRIFT DETECTED: Infrastructure has changed outside of Terraform"
    # Parse the plan for security-relevant changes
    terraform show -json drift-check.plan > drift-details.json
    # Send alert
    ;;
esac

# Clean up plan file
rm -f drift-check.plan
```

The `-detailed-exitcode` flag is key: exit code 2 means there are changes, which indicates drift.

## Scheduled Drift Detection in CI/CD

Run drift checks on a schedule, not just on code changes:

```yaml
# GitHub Actions workflow for drift detection
name: Terraform Drift Detection
on:
  schedule:
    # Run every 4 hours
    - cron: '0 */4 * * *'
  workflow_dispatch: {}

jobs:
  drift-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        workspace: [production, staging]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init

      - name: Select Workspace
        run: terraform workspace select ${{ matrix.workspace }}

      - name: Check for Drift
        id: plan
        run: |
          terraform plan -detailed-exitcode -no-color 2>&1 | tee plan-output.txt
          echo "exit_code=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Alert on Drift
        if: steps.plan.outputs.exit_code == '2'
        run: |
          # Send to Slack, PagerDuty, or your alerting system
          curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Drift detected in ${{ matrix.workspace }}. Review required.\"}"
```

## Parsing Drift for Security Impact

Not all drift is equally concerning. Focus on security-relevant changes:

```python
#!/usr/bin/env python3
# parse-drift.py - Analyze terraform plan JSON for security-relevant drift

import json
import sys

# Resource types that are security-critical
SECURITY_CRITICAL = {
    "aws_security_group",
    "aws_security_group_rule",
    "aws_vpc_security_group_ingress_rule",
    "aws_vpc_security_group_egress_rule",
    "aws_iam_policy",
    "aws_iam_role",
    "aws_iam_role_policy",
    "aws_iam_role_policy_attachment",
    "aws_s3_bucket_policy",
    "aws_s3_bucket_public_access_block",
    "aws_kms_key",
    "aws_cloudtrail",
    "aws_config_configuration_recorder",
    "aws_network_acl",
    "aws_route_table",
    "aws_guardduty_detector",
}

def analyze_plan(plan_file):
    with open(plan_file) as f:
        plan = json.load(f)

    security_changes = []

    for change in plan.get("resource_changes", []):
        if change["type"] in SECURITY_CRITICAL:
            actions = change["change"]["actions"]
            if "no-op" not in actions:
                security_changes.append({
                    "resource": f"{change['type']}.{change['name']}",
                    "actions": actions,
                    "address": change["address"],
                })

    return security_changes

if __name__ == "__main__":
    changes = analyze_plan(sys.argv[1])
    if changes:
        print(f"SECURITY DRIFT: {len(changes)} security-critical resources changed")
        for c in changes:
            print(f"  - {c['address']}: {c['actions']}")
        sys.exit(1)
    else:
        print("No security-critical drift detected")
```

## Using AWS Config for Drift Detection

AWS Config can detect changes independently of Terraform and alert in real time:

```hcl
# Enable AWS Config
resource "aws_config_configuration_recorder" "main" {
  name     = "config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "config-delivery"
  s3_bucket_name = aws_s3_bucket.config.id

  snapshot_delivery_properties {
    delivery_frequency = "One_Hour"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Rule: alert when security groups allow unrestricted SSH
resource "aws_config_config_rule" "restricted_ssh" {
  name = "restricted-ssh"

  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Rule: alert when S3 buckets become public
resource "aws_config_config_rule" "s3_public_read" {
  name = "s3-bucket-public-read-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Rule: alert when CloudTrail is disabled
resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "cloudtrail-enabled"

  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Auto-remediation: automatically re-enable CloudTrail if disabled
resource "aws_config_remediation_configuration" "cloudtrail" {
  config_rule_name = aws_config_config_rule.cloudtrail_enabled.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-EnableCloudTrail"

  parameter {
    name         = "AutomationAssumeRole"
    static_value = aws_iam_role.config_remediation.arn
  }

  parameter {
    name         = "S3BucketName"
    static_value = aws_s3_bucket.audit_logs.id
  }

  automatic                  = true
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}
```

## Preventing Drift

Prevention is better than detection. Here are strategies to reduce drift:

### Lock Down Console Access

```hcl
# SCP to prevent manual security group changes
resource "aws_organizations_policy" "prevent_sg_changes" {
  name = "prevent-manual-sg-changes"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyManualSGChanges"
        Effect = "Deny"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupEgress"
        ]
        Resource = "*"
        Condition = {
          StringNotLike = {
            # Only allow changes from the Terraform execution role
            "aws:PrincipalArn" = "arn:aws:iam::*:role/terraform-*"
          }
        }
      }
    ]
  })
}
```

### Use Lifecycle Rules for Expected Drift

When you know certain attributes will change outside Terraform (like ASG desired count), use lifecycle rules:

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "${var.project}-asg"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity

  lifecycle {
    # Ignore desired_capacity changes from autoscaling
    ignore_changes = [desired_capacity]
  }
}
```

But never use `ignore_changes` on security-critical attributes. If you find yourself wanting to ignore changes to security group rules or IAM policies, that is a sign of a process problem, not a Terraform problem.

## Remediation Workflow

When you detect drift, follow a structured remediation process:

1. **Investigate**: Was this a legitimate emergency change? Or unauthorized?
2. **Document**: Record the drift in your incident tracking system
3. **Decide**: Should the drift be accepted (update code) or reverted (apply code)?
4. **Act**: Either update the Terraform code to match reality or run `terraform apply` to revert

```bash
# To revert drift back to the Terraform-defined state
terraform apply -auto-approve

# To accept drift and update the state
terraform import aws_security_group_rule.emergency_ssh sg-12345_ingress_tcp_22_22_0.0.0.0/0
# Then update the Terraform code to match
```

## Summary

Terraform drift is not just an operational problem. It is a security problem because it means your actual infrastructure does not match your reviewed and approved configuration. Build automated drift detection into your CI/CD pipeline, focus alerting on security-critical resources, use AWS Config for real-time detection, and use SCPs to prevent manual changes to sensitive resources. The goal is a workflow where every infrastructure change goes through code review, no matter how urgent.

For more on maintaining security posture, see [how to scan Terraform plans for security issues](https://oneuptime.com/blog/post/2026-02-23-how-to-scan-terraform-plans-for-security-issues/view) and [how to implement CIS Benchmarks with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cis-benchmarks-with-terraform/view).
