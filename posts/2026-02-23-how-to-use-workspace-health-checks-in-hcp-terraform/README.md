# How to Use Workspace Health Checks in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Workspace Health, Drift Detection, Monitoring, DevOps

Description: Learn how to use workspace health checks in HCP Terraform to monitor drift, continuous validation, and overall infrastructure health.

---

Workspace health checks in HCP Terraform are a proactive monitoring feature that continuously evaluates the state of your managed infrastructure. Instead of waiting until someone runs `terraform plan` to discover problems, health checks run in the background and alert you when something is off - whether that is infrastructure drift, failed preconditions, or stale runs.

This guide covers how to enable and configure health checks, what they monitor, and how to build a process around them.

## What Health Checks Monitor

Workspace health assessments check two primary things:

### 1. Drift Detection

Health checks run periodic `terraform plan` operations to compare your actual infrastructure against the Terraform state. If someone made a manual change, the health check catches it.

### 2. Continuous Validation

If your Terraform configuration includes `check` blocks, `precondition` blocks, or `postcondition` blocks, health checks evaluate these conditions continuously - not just during plan and apply.

```hcl
# Example: A check block that health assessments evaluate
check "api_health" {
  data "http" "api_endpoint" {
    url = "https://api.example.com/health"
  }

  assert {
    condition     = data.http.api_endpoint.status_code == 200
    error_message = "API health endpoint is not returning 200"
  }
}

# Example: A postcondition on a resource
resource "aws_lb" "app" {
  name               = "app-lb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids

  lifecycle {
    postcondition {
      condition     = self.dns_name != ""
      error_message = "Load balancer DNS name is empty"
    }
  }
}
```

## Enabling Health Checks

### Through the UI

1. Navigate to your workspace
2. Go to **Settings** > **Health**
3. Toggle **Enable Health Assessments**

### Through the API

```bash
# Enable health assessments for a workspace
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
# Enable health checks when creating a workspace
resource "tfe_workspace" "production" {
  name                = "production-infrastructure"
  organization        = "your-org"
  execution_mode      = "remote"
  assessments_enabled = true
  terraform_version   = "1.7.0"
}
```

### Enabling for Multiple Workspaces

If you want to enable health checks across all your production workspaces:

```hcl
# Enable health checks for a list of workspaces
variable "production_workspaces" {
  default = [
    "production-networking",
    "production-compute",
    "production-database",
    "production-monitoring",
  ]
}

resource "tfe_workspace" "production" {
  for_each = toset(var.production_workspaces)

  name                = each.value
  organization        = "your-org"
  execution_mode      = "remote"
  assessments_enabled = true

  tag_names = ["production", "health-monitored"]
}
```

## Understanding Health Status

Workspaces with health checks enabled show one of these statuses:

| Status | Meaning |
|---|---|
| **Healthy** | No drift detected, all checks passing |
| **Drifted** | Infrastructure has changed outside of Terraform |
| **Errored** | The health assessment itself failed (credential issues, etc.) |
| **Assessment failed** | Check or validation conditions returned false |
| **Unknown** | Assessment has not run yet |

## Writing Effective Check Blocks

Check blocks are the building blocks of continuous validation. Here are practical examples:

### Checking Service Availability

```hcl
# Verify that a deployed service is responding
check "web_service_health" {
  data "http" "web_app" {
    url = "https://${aws_lb.app.dns_name}/health"
    request_headers = {
      Accept = "application/json"
    }
  }

  assert {
    condition     = data.http.web_app.status_code == 200
    error_message = "Web application health check is failing"
  }
}
```

### Checking Certificate Expiration

```hcl
# Verify SSL certificate is not expiring soon
check "certificate_expiry" {
  data "aws_acm_certificate" "app_cert" {
    domain   = "app.example.com"
    statuses = ["ISSUED"]
  }

  assert {
    condition     = timecmp(data.aws_acm_certificate.app_cert.not_after, timeadd(timestamp(), "720h")) > 0
    error_message = "SSL certificate expires within 30 days"
  }
}
```

### Checking Resource Compliance

```hcl
# Verify RDS instance is encrypted
check "database_encryption" {
  data "aws_db_instance" "main" {
    db_instance_identifier = aws_db_instance.main.identifier
  }

  assert {
    condition     = data.aws_db_instance.main.storage_encrypted
    error_message = "Database storage encryption has been disabled"
  }
}
```

### Checking DNS Resolution

```hcl
# Verify DNS records are resolving correctly
check "dns_resolution" {
  data "dns_a_record_set" "app" {
    host = "app.example.com"
  }

  assert {
    condition     = length(data.dns_a_record_set.app.addrs) > 0
    error_message = "DNS record for app.example.com is not resolving"
  }
}
```

## Viewing Assessment Results

### Through the UI

The workspace overview shows the current health status. Click through to see:
- When the last assessment ran
- What drift was detected (if any)
- Which check blocks passed or failed
- Historical assessment results

### Through the API

```bash
# Get the latest assessment results
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/assessment-results" \
  | jq '.data[] | {
    created: .attributes["created-at"],
    drifted: .attributes.drifted,
    checks_passed: .attributes["checks-passed"],
    checks_failed: .attributes["checks-failed"],
    resource_drift: (.attributes["resource-drift"] // [] | length)
  }'
```

## Setting Up Notifications

Get alerted when health checks detect issues:

```hcl
# Slack notification for health assessment results
resource "tfe_notification_configuration" "health_alerts" {
  name             = "Health Check Alerts"
  enabled          = true
  destination_type = "slack"
  url              = var.slack_webhook_url
  workspace_id     = tfe_workspace.production.id

  triggers = [
    "assessment:drifted",       # Infrastructure drift detected
    "assessment:check_failure", # Check block failed
  ]
}

# Webhook notification for integration with monitoring tools
resource "tfe_notification_configuration" "health_webhook" {
  name             = "Health Webhook to PagerDuty"
  enabled          = true
  destination_type = "generic"
  url              = "https://events.pagerduty.com/generic/terraform-health"
  token            = var.pagerduty_integration_key
  workspace_id     = tfe_workspace.production.id

  triggers = [
    "assessment:drifted",
    "assessment:check_failure",
  ]
}
```

## Building a Health Dashboard

You can build a custom dashboard by querying the API across all workspaces:

```python
# health_dashboard.py - Query health status across all workspaces
import requests
import os

TFC_TOKEN = os.environ["TFC_TOKEN"]
TFC_ORG = os.environ["TFC_ORG"]
BASE_URL = "https://app.terraform.io/api/v2"
HEADERS = {
    "Authorization": f"Bearer {TFC_TOKEN}",
    "Content-Type": "application/vnd.api+json"
}

def get_all_workspaces():
    """Fetch all workspaces with health assessments enabled."""
    workspaces = []
    page = 1
    while True:
        resp = requests.get(
            f"{BASE_URL}/organizations/{TFC_ORG}/workspaces",
            headers=HEADERS,
            params={"page[number]": page, "page[size]": 100}
        )
        data = resp.json()
        for ws in data["data"]:
            if ws["attributes"].get("assessments-enabled"):
                workspaces.append(ws)
        if data["meta"]["pagination"]["next-page"] is None:
            break
        page = data["meta"]["pagination"]["next-page"]
    return workspaces

def get_health_status(workspace_id):
    """Get the latest health assessment for a workspace."""
    resp = requests.get(
        f"{BASE_URL}/workspaces/{workspace_id}/assessment-results",
        headers=HEADERS,
        params={"page[size]": 1}
    )
    results = resp.json()["data"]
    if results:
        return results[0]["attributes"]
    return None

# Generate health report
workspaces = get_all_workspaces()
print(f"{'Workspace':<40} {'Status':<15} {'Drifted':<10} {'Checks Failed'}")
print("-" * 85)

for ws in workspaces:
    health = get_health_status(ws["id"])
    if health:
        name = ws["attributes"]["name"]
        drifted = "Yes" if health.get("drifted") else "No"
        checks_failed = health.get("checks-failed", 0)
        status = "DRIFTED" if health.get("drifted") else ("FAILED" if checks_failed else "HEALTHY")
        print(f"{name:<40} {status:<15} {drifted:<10} {checks_failed}")
```

## Health Check Best Practices

### Start with Critical Workspaces

Enable health checks on production workspaces first, then expand:

```hcl
# Prioritize production workspaces
resource "tfe_workspace" "critical" {
  for_each = {
    "prod-database"    = true
    "prod-networking"  = true
    "prod-compute"     = true
    "staging-database" = false  # Enable later
  }

  name                = each.key
  organization        = "your-org"
  assessments_enabled = each.value
}
```

### Write Meaningful Check Messages

Make error messages actionable:

```hcl
# Bad - vague error message
check "db_check" {
  assert {
    condition     = data.aws_db_instance.main.status == "available"
    error_message = "Database check failed"
  }
}

# Good - actionable error message
check "database_availability" {
  assert {
    condition     = data.aws_db_instance.main.status == "available"
    error_message = "Production database ${data.aws_db_instance.main.identifier} is in status '${data.aws_db_instance.main.status}' instead of 'available'. Check the RDS console and CloudWatch alarms."
  }
}
```

### Combine with OneUptime Monitoring

Use health check notifications alongside your monitoring stack for a complete view:

```hcl
resource "tfe_notification_configuration" "oneuptime_webhook" {
  name             = "OneUptime Integration"
  enabled          = true
  destination_type = "generic"
  url              = "https://oneuptime.com/api/webhook/terraform-health"
  workspace_id     = tfe_workspace.production.id
  triggers         = ["assessment:drifted", "assessment:check_failure"]
}
```

## Troubleshooting Health Checks

**Assessments not running**: Verify the workspace has a successful run (health checks need at least one applied state). Check that `assessments-enabled` is true.

**False positives from check blocks**: If a check depends on external services that have intermittent availability, consider adding retry logic or using a less strict condition.

**Assessment errors**: These usually indicate credential issues. The health assessment uses the same credentials as regular runs - make sure workspace variables are current.

## Summary

Workspace health checks give you continuous visibility into your infrastructure state without waiting for someone to run a plan. Enable them on critical workspaces, write meaningful check blocks for continuous validation, set up notifications to stay informed, and build a process for responding to detected drift and check failures. The goal is to catch problems early, before they compound into bigger issues.

For more on drift specifically, see our guide on [handling drift detection in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-drift-detection-in-hcp-terraform/view).
