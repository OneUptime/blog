# How to Use Run Tasks in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Run Tasks, Security Scanning, Compliance, DevOps

Description: Learn how to configure run tasks in HCP Terraform to integrate third-party tools like security scanners, cost estimators, and compliance checkers into your Terraform workflow.

---

Run tasks let you plug external tools into the HCP Terraform run lifecycle. When Terraform plans your changes, run tasks send the plan data to external services for analysis. Security scanners can check for misconfigurations. Cost management tools can estimate spending. Compliance platforms can verify policy adherence. The external service responds with a pass, fail, or advisory result that HCP Terraform uses to gate the apply.

This guide covers how to configure run tasks, integrate common tools, and build custom run task handlers.

## How Run Tasks Work

The lifecycle is:

1. HCP Terraform starts a plan
2. After the plan completes, it sends a webhook to each configured run task
3. The webhook includes a callback URL and the plan details
4. The external service processes the plan and sends results back via the callback
5. HCP Terraform collects results from all run tasks
6. If any mandatory run task fails, the apply is blocked
7. If all pass (or only advisory tasks fail), the run proceeds

Run tasks execute in a specific phase:
- **Pre-plan** - Before Terraform creates the plan
- **Post-plan** - After the plan, before apply confirmation
- **Pre-apply** - After confirmation, before the apply starts

## Creating a Run Task

### Through the UI

1. Go to your organization's **Settings**
2. Click **Run Tasks**
3. Click **Create run task**
4. Fill in the details:

```text
Name: Security Scanner
Endpoint URL: https://scanner.example.com/terraform-callback
HMAC Key: your-secret-hmac-key (for verifying webhook authenticity)
```

5. After creating the task, attach it to workspaces

### Through the tfe Provider

```hcl
# Create the run task at the organization level
resource "tfe_organization_run_task" "security_scan" {
  name         = "security-scanner"
  organization = var.organization
  url          = "https://scanner.example.com/terraform-callback"
  hmac_key     = var.scanner_hmac_key
  enabled      = true
}

# Attach the run task to a workspace
resource "tfe_workspace_run_task" "prod_security" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.security_scan.id
  enforcement_level = "mandatory"   # "advisory" or "mandatory"
  stage             = "post_plan"   # "pre_plan", "post_plan", or "pre_apply"
}
```

### Through the API

```bash
# Create an organization-level run task
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "tasks",
      "attributes": {
        "name": "security-scanner",
        "url": "https://scanner.example.com/terraform-callback",
        "hmac-key": "your-hmac-key",
        "enabled": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/tasks"
```

## Enforcement Levels

Each run task attached to a workspace has an enforcement level:

- **Advisory**: Results are shown but do not block the apply. Use this for informational checks or tools you are evaluating.
- **Mandatory**: A failed result blocks the apply. Use this for security and compliance checks that must pass.

```hcl
# Security scanning is mandatory - must pass to apply
resource "tfe_workspace_run_task" "security" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.security_scan.id
  enforcement_level = "mandatory"
  stage             = "post_plan"
}

# Cost estimation is advisory - shows info but does not block
resource "tfe_workspace_run_task" "cost" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.cost_estimator.id
  enforcement_level = "advisory"
  stage             = "post_plan"
}
```

## Integrating Common Tools

### Snyk

Snyk provides a native HCP Terraform integration for scanning Terraform plans for security issues:

```hcl
resource "tfe_organization_run_task" "snyk" {
  name         = "snyk-iac"
  organization = var.organization
  url          = "https://api.snyk.io/v1/terraform-cloud"
  hmac_key     = var.snyk_hmac_key
  enabled      = true
}

resource "tfe_workspace_run_task" "snyk_prod" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.snyk.id
  enforcement_level = "mandatory"
  stage             = "post_plan"
}
```

### Bridgecrew/Checkov

Bridgecrew (Checkov) scans plans for misconfigurations against hundreds of built-in rules:

```hcl
resource "tfe_organization_run_task" "checkov" {
  name         = "checkov"
  organization = var.organization
  url          = var.checkov_endpoint_url
  hmac_key     = var.checkov_hmac_key
  enabled      = true
}
```

### Infracost

Infracost estimates the cost impact of infrastructure changes:

```hcl
resource "tfe_organization_run_task" "infracost" {
  name         = "infracost"
  organization = var.organization
  url          = "https://dashboard.api.infracost.io/tfc/run-task"
  hmac_key     = var.infracost_hmac_key
  enabled      = true
}

# Cost estimation as advisory (informational)
resource "tfe_workspace_run_task" "infracost_prod" {
  workspace_id      = tfe_workspace.production.id
  task_id           = tfe_organization_run_task.infracost.id
  enforcement_level = "advisory"
  stage             = "post_plan"
}
```

## Building a Custom Run Task

You can build your own run task handler. The handler is an HTTP endpoint that:

1. Receives a POST request from HCP Terraform
2. Processes the plan data
3. Sends results back via a callback URL

Here is a minimal example in Python with Flask:

```python
import hashlib
import hmac
import json
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
HMAC_KEY = "your-secret-hmac-key"

def verify_hmac(payload, signature):
    """Verify the HMAC signature from HCP Terraform."""
    expected = hmac.new(
        HMAC_KEY.encode(),
        payload,
        hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route("/terraform-callback", methods=["POST"])
def handle_run_task():
    # Verify the request is from HCP Terraform
    signature = request.headers.get("X-TFC-Task-Signature", "")
    if not verify_hmac(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401

    payload = request.json
    callback_url = payload["task_result_callback_url"]
    access_token = payload["access_token"]
    run_id = payload.get("run_id", "unknown")

    # Process the plan (your custom logic here)
    # You can fetch the plan JSON from HCP Terraform API
    # using the access_token if needed

    # Determine the result
    passed = True  # Your validation logic
    message = "All checks passed" if passed else "Found issues"

    # Send results back to HCP Terraform
    result = {
        "data": {
            "type": "task-results",
            "attributes": {
                "status": "passed" if passed else "failed",
                "message": message,
                "url": f"https://scanner.example.com/results/{run_id}"
            }
        }
    }

    requests.patch(
        callback_url,
        json=result,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/vnd.api+json",
        }
    )

    return jsonify({"status": "processing"}), 200

if __name__ == "__main__":
    app.run(port=8080)
```

The callback result status can be:
- `passed` - The check succeeded
- `failed` - The check found issues
- `running` - Still processing (send a final status later)

## Run Task Results in the UI

When a run has tasks, the UI shows results between the plan and apply phases:

```text
Plan: 3 to add, 1 to change, 0 to destroy.

--- Run Tasks ---
  security-scanner    passed (mandatory)    "No security issues found"
  infracost           passed (advisory)     "Monthly cost: +$42.50"
  compliance-check    failed (advisory)     "Missing encryption tag"

--- Ready to Apply ---
```

Since `compliance-check` is advisory, the run can still proceed despite the failure. If `security-scanner` had failed, the apply would be blocked.

## Applying Run Tasks to Multiple Workspaces

Use a loop to attach a run task to all production workspaces:

```hcl
variable "production_workspaces" {
  type = map(string)
  default = {
    networking = "ws-net123"
    compute    = "ws-comp456"
    database   = "ws-db789"
  }
}

resource "tfe_workspace_run_task" "security_all_prod" {
  for_each = var.production_workspaces

  workspace_id      = each.value
  task_id           = tfe_organization_run_task.security_scan.id
  enforcement_level = "mandatory"
  stage             = "post_plan"
}
```

## Wrapping Up

Run tasks extend HCP Terraform's capabilities by integrating external tools into the run lifecycle. Use them for security scanning with tools like Snyk or Checkov, cost estimation with Infracost, or custom compliance checks with your own handler. Start with advisory enforcement to evaluate a tool, then switch to mandatory once you trust the results. Run tasks, combined with Sentinel policies and cost estimation, give you a comprehensive governance layer that catches problems before they reach production.
