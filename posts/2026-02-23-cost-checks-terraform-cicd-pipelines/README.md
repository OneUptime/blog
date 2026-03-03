# How to Implement Cost Checks in Terraform CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Cost Management, FinOps, DevOps, Infrastructure as Code

Description: Add automated cost estimation and budget checks to your Terraform CI/CD pipelines using Infracost, OPA policies, and custom scripts to prevent unexpected cloud bills.

---

Nothing ruins your week quite like discovering a Terraform apply spun up resources that cost thousands of dollars more than expected. Cost checks in your CI/CD pipeline catch these surprises before they hit production. Instead of finding out at the end of the month, your pipeline tells you "this change adds $500/month" right on the pull request.

This post shows you how to integrate cost estimation into your Terraform CI/CD pipeline.

## Infracost: The Primary Tool

Infracost is the de facto tool for Terraform cost estimation. It reads your Terraform plan and estimates the monthly cost based on cloud pricing APIs.

### Installation and Setup

```yaml
# .github/workflows/cost-check.yml
name: Terraform Cost Check
on:
  pull_request:
    paths: ['infrastructure/**']

jobs:
  cost:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      # Generate Terraform plan
      - name: Terraform Plan
        working-directory: infrastructure
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      # Install and run Infracost
      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Generate Cost Estimate
        run: |
          infracost breakdown \
            --path infrastructure/plan.json \
            --format json \
            --out-file /tmp/infracost.json

      # Post cost estimate as PR comment
      - name: Post Cost Comment
        run: |
          infracost comment github \
            --path /tmp/infracost.json \
            --repo ${{ github.repository }} \
            --pull-request ${{ github.event.pull_request.number }} \
            --github-token ${{ secrets.GITHUB_TOKEN }} \
            --behavior update
```

This produces a clean cost breakdown right on your PR:

```text
Monthly cost will increase by $142.50

Resource                     Monthly Cost    Change
aws_instance.api (x3)       $210.24         +$140.16 (new)
aws_db_instance.main         $186.00         +$0.00
aws_s3_bucket.assets         $2.34           +$2.34 (new)
Total                        $398.58         +$142.50
```

## Setting Cost Thresholds

Automatically fail the pipeline when costs exceed a threshold:

```yaml
- name: Check Cost Threshold
  run: |
    # Extract cost difference from Infracost output
    DIFF=$(jq '.diffTotalMonthlyCost | tonumber' /tmp/infracost.json)
    THRESHOLD=500

    echo "Monthly cost change: \$${DIFF}"
    echo "Threshold: \$${THRESHOLD}"

    # Fail if cost increase exceeds threshold
    if (( $(echo "$DIFF > $THRESHOLD" | bc -l) )); then
      echo "COST CHECK FAILED: Monthly cost increase of \$${DIFF} exceeds \$${THRESHOLD} threshold"
      echo "Please get approval from the FinOps team before proceeding"
      exit 1
    fi

    echo "Cost check passed"
```

## Tiered Approval Based on Cost

Different cost levels can require different approval paths:

```yaml
- name: Determine Approval Requirements
  id: cost-gate
  run: |
    DIFF=$(jq '.diffTotalMonthlyCost | tonumber' /tmp/infracost.json)

    if (( $(echo "$DIFF <= 100" | bc -l) )); then
      echo "level=auto" >> "$GITHUB_OUTPUT"
      echo "Cost under $100/month - auto-approved"
    elif (( $(echo "$DIFF <= 1000" | bc -l) )); then
      echo "level=team-lead" >> "$GITHUB_OUTPUT"
      echo "Cost under $1000/month - team lead approval required"
    else
      echo "level=director" >> "$GITHUB_OUTPUT"
      echo "Cost over $1000/month - director approval required"
    fi

- name: Add Approval Label
  uses: actions/github-script@v7
  with:
    script: |
      const level = '${{ steps.cost-gate.outputs.level }}';

      if (level !== 'auto') {
        await github.rest.issues.addLabels({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          labels: [`cost-approval-${level}`]
        });

        // Request review from appropriate team
        const reviewers = level === 'director'
          ? ['engineering-director']
          : ['team-leads'];

        await github.rest.pulls.requestReviewers({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: context.issue.number,
          team_reviewers: reviewers
        });
      }
```

## Cost Policies with OPA

Use Open Policy Agent to define cost policies as code:

```rego
# policies/cost.rego
package terraform.cost

# Deny if total monthly increase exceeds budget
deny[msg] {
    input.diffTotalMonthlyCost > 500
    msg := sprintf("Monthly cost increase of $%.2f exceeds $500 budget", [input.diffTotalMonthlyCost])
}

# Deny expensive instance types
deny[msg] {
    resource := input.projects[_].breakdown.resources[_]
    resource.resourceType == "aws_instance"

    # Check for expensive instance families
    contains(resource.metadata.instance_type, "x1")
    msg := sprintf("Instance %s uses expensive x1 family. Use r6i instead.", [resource.name])
}

# Warn about resources without cost tags
warn[msg] {
    resource := input.projects[_].breakdown.resources[_]
    not resource.tags["cost-center"]
    msg := sprintf("Resource %s missing cost-center tag", [resource.name])
}
```

Run the policy check in your pipeline:

```yaml
- name: Install OPA
  run: |
    curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
    chmod +x opa
    sudo mv opa /usr/local/bin/

- name: Run Cost Policy Check
  run: |
    # Evaluate cost policies
    RESULT=$(opa eval \
      --input /tmp/infracost.json \
      --data policies/cost.rego \
      --format pretty \
      'data.terraform.cost.deny')

    if [ "$RESULT" != "[]" ]; then
      echo "Cost policy violations found:"
      echo "$RESULT"
      exit 1
    fi

    echo "All cost policies passed"
```

## Tracking Cost Trends Over Time

Save cost data to track trends across deployments:

```yaml
- name: Record Cost Data
  run: |
    # Extract key metrics
    TOTAL=$(jq '.totalMonthlyCost | tonumber' /tmp/infracost.json)
    DIFF=$(jq '.diffTotalMonthlyCost | tonumber' /tmp/infracost.json)
    RESOURCES=$(jq '[.projects[].breakdown.resources[]] | length' /tmp/infracost.json)

    # Send to your monitoring system
    curl -X POST "${{ secrets.METRICS_ENDPOINT }}" \
      -H "Content-Type: application/json" \
      -d "{
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"total_monthly_cost\": $TOTAL,
        \"cost_diff\": $DIFF,
        \"resource_count\": $RESOURCES,
        \"commit\": \"${{ github.sha }}\",
        \"pr\": ${{ github.event.pull_request.number }}
      }"
```

## Custom Cost Checks Without Infracost

If you can't use Infracost, build basic cost checks from the Terraform plan JSON:

```bash
#!/bin/bash
# scripts/check-costs.sh
# Basic cost checks from Terraform plan JSON

PLAN_JSON="$1"

# Check for expensive instance types
EXPENSIVE_INSTANCES=$(jq -r '
  [.resource_changes[] |
    select(.type == "aws_instance") |
    select(.change.actions[] == "create") |
    .change.after.instance_type |
    select(test("^(p4|p3|x1|u-)"))] | length
' "$PLAN_JSON")

if [ "$EXPENSIVE_INSTANCES" -gt 0 ]; then
  echo "WARNING: $EXPENSIVE_INSTANCES expensive instance types detected"
  jq -r '
    .resource_changes[] |
    select(.type == "aws_instance") |
    select(.change.actions[] == "create") |
    "\(.address): \(.change.after.instance_type)"
  ' "$PLAN_JSON"
fi

# Check for large RDS instances
LARGE_RDS=$(jq -r '
  [.resource_changes[] |
    select(.type == "aws_db_instance") |
    select(.change.actions[] == "create") |
    .change.after.instance_class |
    select(test("^db\\.(r5|r6g)\\.(2xlarge|4xlarge|8xlarge|12xlarge|16xlarge|24xlarge)"))] | length
' "$PLAN_JSON")

if [ "$LARGE_RDS" -gt 0 ]; then
  echo "WARNING: $LARGE_RDS large RDS instances being created"
fi

# Check for unencrypted storage
UNENCRYPTED=$(jq -r '
  [.resource_changes[] |
    select(.type == "aws_ebs_volume" or .type == "aws_db_instance") |
    select(.change.actions[] == "create") |
    select(.change.after.encrypted == false or .change.after.storage_encrypted == false)] | length
' "$PLAN_JSON")

if [ "$UNENCRYPTED" -gt 0 ]; then
  echo "ERROR: $UNENCRYPTED unencrypted storage resources detected"
  exit 1
fi

echo "Cost checks completed"
```

## Budget Integration with AWS

Connect your cost checks to AWS Budgets for organization-level controls:

```hcl
# budget-alerts.tf
# Create AWS Budget that tracks Terraform-managed resources
resource "aws_budgets_budget" "terraform_resources" {
  name         = "terraform-managed-resources"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:ManagedBy$terraform"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = ["platform-team@company.com"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["engineering-director@company.com"]
  }
}
```

## Summary

Implementing cost checks in your Terraform CI/CD pipeline:

1. Use Infracost to estimate costs from Terraform plans and post results to PRs
2. Set cost thresholds that fail the pipeline when exceeded
3. Implement tiered approval based on cost impact
4. Define cost policies with OPA for repeatable governance
5. Track cost trends over time to spot patterns
6. Fall back to custom plan analysis when Infracost is not available

The goal is to shift cost awareness left - catching expensive changes at PR time rather than at invoice time. Start with basic Infracost integration and threshold checks, then add policy-based controls as your FinOps practice matures. For the full CI/CD pipeline setup, see [Terraform CI/CD with pull request workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view).
