# How to Implement Continuous Validation with TACOs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, TACOS, Continuous Validation, GitOps, Infrastructure as Code

Description: Learn how to use TACOs (Terraform Automation and Collaboration Software) to implement continuous plan validation and drift detection for OpenTofu.

---

TACOS (Terraform Automation and Collaboration Software) like Spacelift, Atlantis, and env0 add continuous validation, drift detection, and collaborative approval workflows on top of OpenTofu. Continuous validation runs plans automatically to detect infrastructure drift.

---

## What Continuous Validation Provides

- **Drift detection** - periodic `tofu plan` runs reveal when infrastructure diverges from code
- **Policy enforcement** - OPA/Sentinel policies run against every plan
- **Collaboration** - PR-based plan approval workflows
- **Audit trail** - all applies logged with user, time, and change summary

---

## Atlantis: Self-Hosted TACOS

```yaml
# atlantis.yaml - in your repository root

version: 3
projects:
  - name: networking
    dir: ./infrastructure/networking
    workspace: production
    autoplan:
      when_modified: ["*.tf", "*.tfvars"]
      enabled: true

  - name: compute
    dir: ./infrastructure/compute
    workspace: production
    autoplan:
      when_modified: ["*.tf"]
```

With Atlantis, every PR automatically generates a `tofu plan`. Collaborators comment `atlantis apply` to trigger the apply after review.

---

## Spacelift: Managed TACOS with Drift Detection

Stacks and drift detection in Spacelift are configured via the Spacelift Terraform provider (or the UI/API), not a YAML file:

```hcl
resource "spacelift_stack" "networking" {
  name              = "networking"
  repository        = "infrastructure"
  branch            = "main"
  project_root      = "infrastructure/networking"
  terraform_version = "1.7.0"
  autodeploy        = false
}

resource "spacelift_drift_detection" "networking" {
  stack_id  = spacelift_stack.networking.id
  schedule  = ["0 */6 * * *"]   # Every 6 hours
  reconcile = false              # Alert only, don't auto-remediate
}
```

---

## OpenTofu Check Blocks for Continuous Validation

```hcl
# health.tf
check "production_lb_health" {
  data "http" "health" {
    url = "https://api.example.com/health"
  }

  assert {
    condition     = data.http.health.status_code == 200
    error_message = "Production API health check failed."
  }
}
```

Run continuously in a TACOS:
```bash
# Scheduled periodic plan
tofu plan  # Check blocks run automatically during plan
```

---

## GitHub Actions Scheduled Drift Detection

```yaml
name: Drift Detection

on:
  schedule:
    - cron: "0 8 * * *"  # Daily at 8 AM UTC

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: tofu plan (drift check)
        run: |
          tofu init
          tofu plan -detailed-exitcode
        # Exit code 2 = changes detected (drift)
```

---

## Summary

TACOS add continuous validation to OpenTofu by running periodic plans and surfacing drift. Use Atlantis for self-hosted PR-based workflows, Spacelift or env0 for managed platforms with built-in drift detection. Combine with OpenTofu `check` blocks for health assertions that run on every plan. Schedule drift detection in CI/CD to detect manual changes before they cause incidents.
