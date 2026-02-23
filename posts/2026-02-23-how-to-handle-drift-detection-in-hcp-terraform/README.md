# How to Handle Drift Detection in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Drift Detection, State Management, Infrastructure Monitoring

Description: Learn how to detect, understand, and remediate infrastructure drift in HCP Terraform to keep your actual infrastructure in sync with your code.

---

Infrastructure drift is what happens when the actual state of your infrastructure diverges from what Terraform thinks it should be. Someone manually edits a security group in the AWS console, an auto-scaler changes instance counts, or a colleague makes a "quick fix" through the cloud provider's UI. Suddenly, your Terraform state says one thing, but reality says another.

HCP Terraform has built-in drift detection that continuously monitors for these discrepancies. This guide covers how to enable it, interpret the results, and decide how to handle detected drift.

## What Is Drift?

Drift happens when resources are modified outside of Terraform. Common causes include:

- Manual changes in cloud provider consoles (AWS, Azure, GCP)
- Changes made by other automation tools (Ansible, scripts, Lambda functions)
- Auto-scaling events that modify resource attributes
- Cloud provider-initiated changes (upgrades, migrations)
- Emergency fixes applied directly to production

Without drift detection, you might not discover these changes until your next `terraform plan`, which could be weeks or months later. By then, understanding what changed and why becomes much harder.

## How Drift Detection Works in HCP Terraform

HCP Terraform's drift detection:

1. Periodically runs a `terraform plan` on your workspaces (called a "health assessment")
2. Compares the planned output to the current state
3. If there are differences, it flags the workspace as having drift
4. You can optionally receive notifications when drift is detected
5. The drift report shows exactly which resources diverged and how

Drift detection runs do not apply any changes. They are read-only assessments.

## Enabling Drift Detection

Drift detection is part of the workspace health assessment feature, available on the HCP Terraform Plus plan and above.

### Through the UI

1. Go to your workspace in HCP Terraform
2. Navigate to **Settings** > **Health**
3. Enable **Health Assessments**
4. Configure the assessment schedule

### Through the API

```bash
# Enable health assessments (drift detection) for a workspace
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "assessments-enabled": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

### Using the TFE Provider

```hcl
# Enable drift detection on a workspace
resource "tfe_workspace" "production" {
  name                  = "production-infrastructure"
  organization          = "your-org"
  execution_mode        = "remote"
  assessments_enabled   = true  # Enable health assessments (drift detection)
}
```

## Understanding Drift Reports

When drift is detected, the workspace shows a health status indicator. You can view the details:

### Viewing Drift in the UI

1. Go to your workspace
2. Look for the **Health** tab or the drift indicator on the workspace overview
3. Click to see the detailed assessment

### Viewing Drift via the API

```bash
# Get the latest assessment for a workspace
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/assessment-results" \
  | jq '.data[0] | {
    id: .id,
    drifted: .attributes.drifted,
    created_at: .attributes["created-at"],
    resource_drift_count: (.attributes["resource-drift"] | length),
    output_drift_count: (.attributes["output-drift"] | length)
  }'
```

### What the Report Contains

A drift report typically looks like this:

```
Assessment Result: Drift Detected

Resource Drift:
  ~ aws_security_group.web (1 attribute changed)
    - ingress: Added rule allowing port 8080 from 0.0.0.0/0

  ~ aws_instance.app (2 attributes changed)
    - instance_type: "t3.medium" -> "t3.large"
    - tags: Added tag "manual-fix" = "true"

  - aws_cloudwatch_metric_alarm.cpu (resource deleted outside Terraform)

Output Drift:
  ~ app_endpoint: value changed
```

## Handling Detected Drift

When drift is detected, you have several options:

### Option 1: Reconcile by Applying Terraform

If the drift was unintentional or should be reverted, run `terraform apply` to bring infrastructure back in line with your code:

```bash
# Run a plan to see the exact changes Terraform would make
terraform plan

# If the plan looks correct, apply it
terraform apply
```

### Option 2: Update Your Code to Match Reality

If the drift represents a legitimate change that should be kept, update your Terraform code:

```hcl
# Before: Your original code
resource "aws_instance" "app" {
  instance_type = "t3.medium"
  # ...
}

# After: Updated to match the manual change
resource "aws_instance" "app" {
  instance_type = "t3.large"  # Updated to match the manually changed instance
  # ...
}
```

Then run a plan to confirm no changes:

```bash
terraform plan
# No changes. Your infrastructure matches the configuration.
```

### Option 3: Import the New Resources

If someone created a resource manually that should be managed by Terraform:

```hcl
# Add the resource to your configuration
resource "aws_security_group_rule" "manual_fix" {
  type              = "ingress"
  from_port         = 8080
  to_port           = 8080
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.web.id
}
```

```bash
# Import the existing resource into state
terraform import aws_security_group_rule.manual_fix sg-12345678_ingress_tcp_8080_8080_10.0.0.0/8
```

### Option 4: Ignore Specific Drift

For attributes that change frequently outside of Terraform (like auto-scaling counts), use lifecycle rules to ignore them:

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  desired_capacity    = 3
  min_size            = 2
  max_size            = 10

  # Ignore changes to desired_capacity since auto-scaling modifies this
  lifecycle {
    ignore_changes = [desired_capacity]
  }
}
```

## Setting Up Drift Notifications

Get alerted when drift is detected so you can respond promptly:

```hcl
# Slack notification for drift detection
resource "tfe_notification_configuration" "drift_alerts" {
  name             = "Drift Detection Alerts"
  enabled          = true
  destination_type = "slack"
  triggers         = ["assessment:drifted"]
  url              = var.slack_webhook_url
  workspace_id     = tfe_workspace.production.id
}

# Email notification
resource "tfe_notification_configuration" "drift_email" {
  name             = "Drift Email Alerts"
  enabled          = true
  destination_type = "email"
  triggers         = ["assessment:drifted"]
  email_user_ids   = [data.tfe_organization_members.admins.members[*].user_id]
  workspace_id     = tfe_workspace.production.id
}
```

## Automating Drift Remediation

For workspaces where drift should always be corrected automatically, you can set up automated remediation:

```bash
#!/bin/bash
# drift-remediation.sh - Check for drift and trigger a corrective run

WORKSPACE_NAME="production-infrastructure"

# Get workspace ID
WORKSPACE_ID=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces/${WORKSPACE_NAME}" \
  | jq -r '.data.id')

# Check latest assessment
DRIFTED=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/assessment-results" \
  | jq -r '.data[0].attributes.drifted')

if [ "$DRIFTED" = "true" ]; then
  echo "Drift detected in ${WORKSPACE_NAME}. Triggering corrective run..."

  # Trigger a run to fix the drift
  curl \
    --header "Authorization: Bearer $TFC_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data "{
      \"data\": {
        \"type\": \"runs\",
        \"attributes\": {
          \"message\": \"Automated drift remediation\",
          \"auto-apply\": true
        },
        \"relationships\": {
          \"workspace\": {
            \"data\": {
              \"type\": \"workspaces\",
              \"id\": \"${WORKSPACE_ID}\"
            }
          }
        }
      }
    }" \
    "https://app.terraform.io/api/v2/runs"
else
  echo "No drift detected in ${WORKSPACE_NAME}."
fi
```

## Preventing Drift

While detection is important, prevention is better:

### Lock Down Manual Access

Reduce the ability for people to make manual changes:

- Use restrictive IAM policies that prevent console modifications
- Implement SCPs (AWS) or Azure Policies to block manual changes to managed resources
- Require all changes to go through the Terraform workflow

### Tag Managed Resources

Tag resources managed by Terraform so people know not to touch them:

```hcl
# Add management tags to all resources
locals {
  common_tags = {
    ManagedBy   = "terraform"
    Workspace   = "production-infrastructure"
    Repository  = "your-org/infra-repo"
    Warning     = "Do not modify manually"
  }
}

resource "aws_instance" "app" {
  # ...
  tags = merge(local.common_tags, {
    Name = "app-server"
  })
}
```

### Educate Your Team

Make sure everyone understands that manual changes to Terraform-managed resources will be detected and potentially reverted.

## Summary

Drift detection in HCP Terraform is an essential safety net for maintaining infrastructure consistency. Enable health assessments on your workspaces, set up notifications so you know when drift happens, and have a clear process for how your team responds to drift. Whether you revert the drift, update your code, or import new resources depends on the specific situation - but the important thing is that you know about it.

For related topics, see our guides on [workspace health checks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-health-checks-in-hcp-terraform/view) and [handling Terraform state](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-state-in-hcp-terraform/view).
