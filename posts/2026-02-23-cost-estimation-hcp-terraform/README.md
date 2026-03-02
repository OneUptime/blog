# How to Use Cost Estimation in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Cost Estimation, FinOps, Cloud Cost, DevOps

Description: Enable and use cost estimation in HCP Terraform to see the monthly cost impact of infrastructure changes before applying them, with policy integration for budget guardrails.

---

Every `terraform apply` has a price tag. An engineer upgrades an instance type and the monthly bill jumps by hundreds of dollars. Someone spins up a new database cluster that costs thousands per month. These surprises are avoidable if you know the cost before you apply. HCP Terraform's cost estimation shows the estimated monthly cost impact of every plan, right in the run output.

This guide covers enabling cost estimation, reading the results, and using policies to enforce cost guardrails.

## Enabling Cost Estimation

Cost estimation is available on HCP Terraform's Team and Business tiers. Enable it at the organization level:

### Through the UI

1. Navigate to your organization's **Settings**
2. Click **Cost Estimation**
3. Toggle **Enable Cost Estimation** to on

Once enabled, every workspace in the organization gets cost estimates on their plans.

### Through the tfe Provider

```hcl
resource "tfe_organization" "main" {
  name  = "acme-infrastructure"
  email = "infra@acme.com"

  cost_estimation_enabled = true
}
```

### Through the API

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "organizations",
      "attributes": {
        "cost-estimation-enabled": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure"
```

## What Gets Estimated

HCP Terraform estimates costs for resources from these providers:

- **AWS** - EC2 instances, RDS, S3, EBS, Lambda, ECS, ElastiCache, and many more
- **Azure** - Virtual machines, SQL databases, storage accounts, App Service, and others
- **GCP** - Compute instances, Cloud SQL, Cloud Storage, GKE, and others

The estimates use on-demand pricing from each provider's public price list. They do not account for:
- Reserved instances or savings plans
- Free tier usage
- Data transfer costs (in most cases)
- Costs that depend on usage (like per-request charges)

This means the estimates are a baseline. Actual costs may be lower if you have commitments, or higher if you have significant data transfer.

## Reading Cost Estimation Results

After a plan completes, the cost estimate appears before the apply:

```
Plan: 3 to add, 1 to change, 0 to destroy.

--------
Cost Estimation:

Resources: 4 of 5 estimated
  $1,247.50/mo +$485.00

  + aws_instance.web (x3)        +$315.36/mo
  + aws_db_instance.main         +$169.64/mo
  ~ aws_instance.api              $0.00/mo -> $0.00/mo

--------
```

The output shows:
- **Total estimated monthly cost** for all resources in the workspace
- **Cost delta** - how much the change adds or removes from the monthly total
- **Per-resource breakdown** showing what each resource costs
- **Number of resources estimated** vs total (some resources have no pricing data)

## Cost Estimation in the UI

In the HCP Terraform web interface, cost estimation results appear as a dedicated section in the run details page. You see:

1. A summary bar showing the total cost change
2. A detailed breakdown by resource
3. The previous monthly cost vs the new monthly cost

This is visible to anyone reviewing the run, making cost implications transparent during the approval process.

## Cost Estimation via the API

Retrieve cost estimation data programmatically:

```bash
# Get the cost estimate for a specific run
RUN_ID="run-abc123"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/cost-estimate"
```

Response:

```json
{
  "data": {
    "type": "cost-estimates",
    "id": "ce-xyz789",
    "attributes": {
      "status": "finished",
      "status-timestamps": {
        "queued-at": "2026-02-23T10:00:00Z",
        "finished-at": "2026-02-23T10:00:15Z"
      },
      "error-message": null,
      "matched-resources-count": 4,
      "unmatched-resources-count": 1,
      "resources-count": 5,
      "prior-monthly-cost": "762.50",
      "proposed-monthly-cost": "1247.50",
      "delta-monthly-cost": "485.00"
    }
  }
}
```

## Enforcing Cost Policies with Sentinel

The real power of cost estimation comes when you combine it with Sentinel policies to enforce budget limits:

### Block Runs That Exceed a Cost Threshold

```python
# cost-limit.sentinel
# Block plans that increase monthly costs by more than $500

import "tfrun"

# Maximum allowed monthly cost increase
max_monthly_increase = 500

# Get the cost estimate
delta = tfrun.cost_estimate.delta_monthly_cost

# Log the cost change for visibility
print("Monthly cost change: $" + string(delta))

# Policy passes if the increase is within the threshold
main = rule {
  delta <= max_monthly_increase
}
```

### Require Approval for Large Cost Changes

```python
# cost-approval.sentinel
# Require manager approval for cost increases over $200
# This is soft-mandatory so it can be overridden with justification

import "tfrun"

approval_threshold = 200

delta = tfrun.cost_estimate.delta_monthly_cost

if delta > approval_threshold {
  print("This change increases monthly costs by $" + string(delta))
  print("Changes exceeding $" + string(approval_threshold) + "/mo require manager approval")
}

main = rule {
  delta <= approval_threshold
}
```

```hcl
# sentinel.hcl
policy "cost-limit" {
  source            = "./cost-limit.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "cost-approval" {
  source            = "./cost-approval.sentinel"
  enforcement_level = "soft-mandatory"
}
```

### Tiered Cost Controls

```python
# cost-tiers.sentinel
# Different limits based on workspace tags

import "tfrun"
import "tfconfig/v2" as tfconfig

# Cost limits by environment
limits = {
  "dev":        100,
  "staging":    500,
  "production": 2000,
}

# Determine the environment from workspace tags
# (assumes an "environment" tag is set on the workspace)
environment = "production"  # Default to strictest

for tfrun.workspace.tags as tag {
  if tag in keys(limits) {
    environment = tag
  }
}

delta = tfrun.cost_estimate.delta_monthly_cost
limit = limits[environment]

if delta > limit {
  print("Cost increase of $" + string(delta) + " exceeds the $" + string(limit) + " limit for " + environment)
}

main = rule {
  delta <= limit
}
```

## Using OPA for Cost Policies

```rego
# cost-limit.rego
package terraform.policies.cost_limit

import input.run as tfrun

# Maximum monthly cost increase allowed
max_increase := 500

deny[msg] {
  delta := tfrun.cost_estimate.delta_monthly_cost
  delta > max_increase
  msg := sprintf(
    "Monthly cost increase of $%.2f exceeds the maximum allowed increase of $%.2f",
    [delta, max_increase]
  )
}
```

## Cost Estimation in PR Workflows

When using VCS-driven workflows, cost estimation runs on speculative plans triggered by pull requests. This means:

1. Developer opens a PR that adds three new EC2 instances
2. HCP Terraform runs a speculative plan
3. Cost estimation shows the monthly impact
4. The PR status check includes the cost information
5. Reviewers see the cost impact before approving

This feedback loop catches expensive changes early, when they are cheapest to fix.

## Reporting and Tracking

Export cost estimation data for reporting:

```bash
#!/bin/bash
# export-costs.sh - Export cost estimates for all recent runs

ORG="acme-infrastructure"

# Get all workspaces
WORKSPACES=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/$ORG/workspaces?page%5Bsize%5D=100" \
  | jq -r '.data[].id')

echo "workspace,proposed_monthly_cost,delta_monthly_cost"

for WS_ID in $WORKSPACES; do
  # Get the latest run
  LATEST_RUN=$(curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    "https://app.terraform.io/api/v2/workspaces/$WS_ID/runs?page%5Bsize%5D=1" \
    | jq -r '.data[0].id // empty')

  if [ -n "$LATEST_RUN" ]; then
    # Get cost estimate
    COST=$(curl -s \
      --header "Authorization: Bearer $TFC_TOKEN" \
      "https://app.terraform.io/api/v2/runs/$LATEST_RUN/cost-estimate" \
      | jq -r '.data.attributes | "\(.proposed-monthly-cost // "N/A"),\(.delta-monthly-cost // "N/A")"')

    WS_NAME=$(curl -s \
      --header "Authorization: Bearer $TFC_TOKEN" \
      "https://app.terraform.io/api/v2/workspaces/$WS_ID" \
      | jq -r '.data.attributes.name')

    echo "$WS_NAME,$COST"
  fi
done
```

## Best Practices

1. **Enable cost estimation organization-wide.** There is no reason not to - it is informational and adds no overhead.

2. **Set up Sentinel cost policies** with soft-mandatory enforcement first. Let teams get used to seeing cost information before making it blocking.

3. **Use different thresholds per environment.** Dev workspaces should have lower cost limits than production.

4. **Review cost estimates in PRs.** Make it part of your code review checklist to check the cost impact.

5. **Track cost trends over time.** Export cost data regularly to spot gradual increases.

6. **Remember the limitations.** Cost estimation uses on-demand pricing and does not account for reserved instances or usage-based charges. Treat it as a directional indicator, not an exact bill prediction.

## Wrapping Up

Cost estimation in HCP Terraform brings financial visibility into every infrastructure change. Enable it at the organization level, review estimates during PR reviews, and enforce cost guardrails with Sentinel or OPA policies. The combination of visibility (seeing costs in every plan) and enforcement (blocking changes that exceed thresholds) prevents cost surprises and makes infrastructure spending a deliberate decision rather than an afterthought.
