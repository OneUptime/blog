# How to Use OpenTofu with Spacelift Drift Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Spacelift, Drift Detection, Configuration Drift, GitOps

Description: Learn how to configure Spacelift's drift detection feature with OpenTofu to automatically detect and remediate infrastructure configuration drift.

## Introduction

Drift occurs when real infrastructure diverges from the OpenTofu state and HCL configuration - due to manual changes, other automation tools, or AWS auto-healing. Spacelift's drift detection runs periodic reconciliation to catch and optionally fix drift.

## Enabling Drift Detection on a Stack

```hcl
resource "spacelift_stack" "app" {
  name                    = "production-app"
  terraform_workflow_tool = "OPEN_TOFU"
  terraform_version       = "1.7.0"
  repository              = "my-org/infrastructure"
  branch                  = "main"
  project_root            = "environments/prod"
}

# Enable scheduled drift detection

resource "spacelift_drift_detection" "app" {
  stack_id = spacelift_stack.app.id

  # Run drift detection every 30 minutes
  schedule = ["*/30 * * * *"]

  # Auto-remediate: automatically apply if drift is detected
  reconcile = false  # Set to true to enable auto-remediation

  # Timezone for schedule
  timezone = "America/New_York"
}
```

## Drift Detection Policy

Control how drift is handled with a plan policy:

```rego
# policies/drift-detection.rego
# Different behavior for drift runs vs regular runs

package spacelift

# For drift detection runs, only warn - don't block
warn[sprintf("Drift detected in %s: %v", [resource.address, resource.change.actions])] {
    input.spacelift.run.drift_detection
    resource := input.terraform.resource_changes[_]
    count(resource.change.actions) > 0
}

# For regular runs, block if there's significant drift
deny["Drift detected: manual changes found outside of OpenTofu management"] {
    not input.spacelift.run.drift_detection
    drift_resources := [r | r := input.terraform.resource_changes[_]; r.change.actions[_] == "update"]
    count(drift_resources) > 10
}
```

## Notification on Drift

```hcl
# Send Slack notification when drift is detected
resource "spacelift_webhook" "drift_alerts" {
  endpoint = var.slack_webhook_url
  enabled  = true
  stack_id = spacelift_stack.app.id

  # Trigger on drift detection runs with changes
}
```

## Handling Legitimate Drift vs Unauthorized Changes

```rego
# policies/drift-classification.rego
# Distinguish between expected drift (auto-scaling) and unauthorized changes

package spacelift

# Auto-scaling changes to desired count are expected
expected_drift_attrs := {
    "aws_autoscaling_group.desired_capacity",
    "aws_ecs_service.desired_count"
}

# Warn only on drift that is NOT in expected auto-scaling attributes
warn[sprintf("Unexpected drift in %s: %v", [resource.address, resource.change.actions])] {
    input.spacelift.run.drift_detection
    resource := input.terraform.resource_changes[_]
    count(resource.change.actions) > 0
    not is_expected_drift(resource)
}

is_expected_drift(resource) {
    resource.change.actions == ["update"]
    every attr in object.keys(resource.change.after) {
        expected_drift_attrs[sprintf("%s.%s", [resource.address, attr])]
    }
}
```

## Selective Drift Detection by Resource Type

```hcl
# Use separate stacks for resources that legitimately drift frequently
resource "spacelift_stack" "stateful_resources" {
  name                    = "prod-stateful"
  terraform_workflow_tool = "OPEN_TOFU"
  terraform_version       = "1.7.0"
  project_root            = "environments/prod/stateful"
}

# No drift detection on stateful resources that change frequently
# Only detect drift on immutable infrastructure
resource "spacelift_drift_detection" "immutable_infra" {
  stack_id = spacelift_stack.app.id
  schedule = ["0 * * * *"]  # Every hour
  reconcile = false
}
```

## Conclusion

Spacelift drift detection provides continuous compliance checking for OpenTofu-managed infrastructure. Configure non-auto-remediation first to understand your drift patterns, then enable auto-remediation (`reconcile = true`) for environments where you're confident the OpenTofu configuration is the source of truth. Use policies to distinguish between expected drift (auto-scaling) and unauthorized manual changes.
