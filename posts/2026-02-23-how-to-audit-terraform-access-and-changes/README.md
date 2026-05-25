# How to Audit Terraform Access and Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Auditing, Infrastructure as Code, Compliance

Description: Learn how to set up comprehensive audit trails for Terraform access and infrastructure changes to maintain security and compliance.

---

When you manage infrastructure with Terraform, keeping track of who changed what and when is not optional. It is a requirement for security, compliance, and plain old operational sanity. Without a solid audit strategy, you are flying blind - and that is a recipe for trouble when something breaks at 2 AM or when an auditor comes knocking.

This guide walks through practical approaches to auditing Terraform access and changes, from version control practices to cloud-native audit tooling.

## Why Auditing Terraform Matters

Terraform manages your most critical infrastructure. A single misconfigured security group or an accidentally deleted database can cause serious damage. Auditing gives you:

- A clear record of every change made to your infrastructure
- The ability to trace issues back to specific commits and authors
- Evidence of compliance for frameworks like SOC 2, HIPAA, and PCI DSS
- Insight into who has access to what and when they used it

## Start with Version Control

The most basic form of Terraform auditing is version control. Every change to your `.tf` files should go through a pull request process with proper review.

```hcl
# Example: .gitignore for Terraform projects

# Never commit state files or secrets
*.tfstate
*.tfstate.backup
*.tfvars
.terraform/
*.auto.tfvars
```

Configure your repository to require pull request approvals:

```hcl
# Example GitHub branch protection (via Terraform)
resource "github_branch_protection" "main" {
  repository_id = github_repository.infra.node_id
  pattern       = "main"

  # Require at least two reviewers
  required_pull_request_reviews {
    required_approving_review_count = 2
    dismiss_stale_reviews           = true
  }

  # Require status checks to pass
  required_status_checks {
    strict = true
    contexts = [
      "terraform-plan",
      "tfsec",
      "checkov"
    ]
  }
}
```

## Enable Cloud Provider Audit Logging

Your cloud provider has built-in audit logging. Make sure it is turned on and properly configured.

### AWS CloudTrail

```hcl
# Enable CloudTrail for management calls and state-bucket data events
resource "aws_cloudtrail" "audit" {
  name                          = "terraform-audit-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true

  # Log all management events
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  # Also capture S3 data events for state bucket
  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.terraform_state.arn}/"]
    }
  }
}

# Store audit logs in a secure bucket
resource "aws_s3_bucket" "audit_logs" {
  bucket = "my-org-terraform-audit-logs"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning on the audit bucket
resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

### Azure Activity Log

```hcl
# Export Azure Activity Log to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "subscription_audit" {
  name                       = "terraform-audit"
  target_resource_id         = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.audit.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }

  enabled_log {
    category = "Policy"
  }
}
```

## Audit Terraform State Access

Your Terraform state file contains sensitive information. Every access to it should be logged.

```hcl
# S3 backend with logging enabled
terraform {
  backend "s3" {
    bucket       = "my-org-terraform-state"
    key          = "production/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

# Enable S3 server access logging for the state bucket
resource "aws_s3_bucket_logging" "state_logging" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.audit_logs.id
  target_prefix = "state-access-logs/"
}
```

For teams using HCP Terraform, audit logging is built in. You can access it through the API:

```bash
# Query HCP Terraform audit trail
curl -s \
  --header "Authorization: Bearer $TFC_AUDIT_TOKEN" \
  "https://app.terraform.io/api/v2/organization/audit-trail?since=2026-01-01T00:00:00.000Z" \
  | jq '.data[] | {timestamp: .timestamp, action: .resource.action, resource: .resource.type, user: .auth.description}'
```

## Track Plan and Apply Operations

Every `terraform plan` and `terraform apply` should be recorded. In CI/CD pipelines, this happens naturally through job logs. But you can also build custom logging:

```bash
#!/bin/bash
# wrapper script for terraform with audit logging

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
USER=$(whoami)
ACTION=$1
WORKSPACE=$(terraform workspace show)

# Log the operation
echo "{\"timestamp\": \"$TIMESTAMP\", \"user\": \"$USER\", \"action\": \"$ACTION\", \"workspace\": \"$WORKSPACE\"}" \
  >> /var/log/terraform-audit.json

# Run terraform with all arguments
terraform "$@"
EXIT_CODE=$?

# Log the result
echo "{\"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"user\": \"$USER\", \"action\": \"$ACTION\", \"workspace\": \"$WORKSPACE\", \"exit_code\": $EXIT_CODE}" \
  >> /var/log/terraform-audit.json

exit $EXIT_CODE
```

## Use Sentinel or OPA for Policy Auditing

Policy-as-code tools let you define and enforce rules, while also creating an audit trail of policy decisions.

```rego
# Example OPA policy (Rego) - audit all resource changes
package terraform.audit

import rego.v1

# Deny any changes to production without an approved change ticket
deny contains msg if {
  input.workspace == "production"
  not input.variables.change_ticket
  msg := "Production changes require an approved change ticket"
}

# Log all security group modifications
audit contains msg if {
  some resource in input.resource_changes
  resource.type == "aws_security_group"
  resource.change.actions != ["no-op"]
  msg := sprintf("Security group %s is being modified", [resource.address])
}
```

## Set Up Alerting on Critical Changes

Do not just log changes - alert on the ones that matter. Use CloudWatch or similar services to notify your team when high-risk changes occur.

```hcl
# CloudWatch metric filter and alarm for state file modifications recorded by CloudTrail
resource "aws_cloudwatch_log_metric_filter" "state_modification" {
  name           = "terraform-state-modified"
  log_group_name = aws_cloudwatch_log_group.audit.name
  pattern        = "{ ($.eventSource = \"s3.amazonaws.com\") && ($.eventName = \"PutObject\") && ($.requestParameters.bucketName = \"${aws_s3_bucket.terraform_state.id}\") }"

  metric_transformation {
    name      = "TerraformStatePutObject"
    namespace = "Custom/TerraformAudit"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "state_modification" {
  alarm_name          = "terraform-state-modified"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "TerraformStatePutObject"
  namespace           = "Custom/TerraformAudit"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when Terraform state is modified"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.security_alerts.arn]
}
```

## Implement Drift Detection

Infrastructure drift - when the real state diverges from what Terraform expects - is a major audit concern. Schedule regular drift detection runs:

```yaml
# GitHub Actions workflow for drift detection
name: Terraform Drift Detection
on:
  schedule:
    - cron: '0 6 * * *'  # Run daily at 6 AM

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Check for Drift
        id: plan
        run: |
          set +e
          terraform plan -detailed-exitcode -out=drift.plan 2>&1 | tee plan-output.txt
          exitcode=${PIPESTATUS[0]}
          echo "exitcode=$exitcode" >> $GITHUB_OUTPUT
          if [ "$exitcode" -eq 1 ]; then
            exit 1
          fi

      - name: Alert on Drift
        if: steps.plan.outputs.exitcode == '2'
        run: |
          # Send Slack notification about detected drift
          curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data '{"text":"Infrastructure drift detected! Check the latest drift detection run."}'
```

## Centralize Your Audit Logs

All these audit sources should flow into a single place where you can search and analyze them. Common choices include an ELK stack, Splunk, or a cloud-native solution like AWS Security Hub.

```hcl
# Send CloudTrail events to CloudWatch Logs for centralized querying
resource "aws_cloudtrail" "centralized" {
  name                  = "centralized-audit"
  s3_bucket_name        = aws_s3_bucket.audit_logs.id
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.audit.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/cloudtrail/terraform-audit"
  retention_in_days = 365
}
```

## Wrapping Up

Auditing Terraform access and changes is not a one-time setup. It is an ongoing practice that evolves with your infrastructure. Start with version control and branch protection, layer on cloud provider audit logging, and build up to automated drift detection and centralized log analysis. The goal is to never be surprised by an infrastructure change you did not know about.

For monitoring your infrastructure after these changes are applied, consider using [OneUptime](https://oneuptime.com) to keep an eye on uptime, performance, and incidents across your entire stack.
