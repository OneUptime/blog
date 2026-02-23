# How to Use Infracost with Terraform for Cost Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infracost, Cost Management, FinOps, DevOps, Infrastructure as Code

Description: Learn how to use Infracost to estimate and test Terraform infrastructure costs before deployment, set cost policies, and integrate cost reviews into your CI pipeline.

---

Terraform makes it easy to provision infrastructure, sometimes too easy. A small configuration change can add hundreds or thousands of dollars to your monthly bill without anyone noticing until the invoice arrives. Infracost solves this by estimating the cost of your Terraform changes before they are applied. You can see cost diffs in pull requests, set budgets that block deployments, and catch expensive mistakes early.

## How Infracost Works

Infracost parses your Terraform configuration (or plan JSON), maps each resource to its cloud pricing, and calculates the estimated monthly cost. It uses public pricing data from AWS, Azure, and GCP, so you do not need to share any cloud credentials for basic cost estimation.

The workflow:
1. Run `terraform plan` to generate a plan
2. Feed the plan to Infracost
3. Get a cost breakdown and diff

## Installation

Install Infracost on your system:

```bash
# macOS with Homebrew
brew install infracost

# Linux
curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh

# Verify installation
infracost --version
```

Register for a free API key (required for pricing data):

```bash
# Sign up and get an API key
infracost auth login

# Or set the key manually
export INFRACOST_API_KEY="your-api-key"
```

## Basic Cost Estimation

Run a cost breakdown on your Terraform directory:

```bash
# Estimate costs for the current directory
infracost breakdown --path .

# Estimate costs for a specific directory
infracost breakdown --path ./modules/production

# Use a terraform plan JSON file
terraform plan -out=tfplan
terraform show -json tfplan > plan.json
infracost breakdown --path plan.json
```

The output shows a detailed breakdown:

```
Project: main

 Name                                     Monthly Qty  Unit   Monthly Cost

 aws_instance.web
 +- Instance usage (t3.large, on-demand)          730  hours        $60.74
 +- root_block_device
    +- Storage (gp3, 50 GB)                        50  GB            $4.00

 aws_rds_cluster.database
 +- Instance (db.r5.large)                        730  hours       $175.20
 +- Storage                                        50  GB            $5.00

 aws_s3_bucket.data
 +- Standard storage                            1,000  GB           $23.00

 OVERALL TOTAL                                                     $267.94

12 cloud resources were detected:
+- 3 were estimated, all of which include usage-based costs
+- 9 were free
```

## Cost Diffs for Pull Requests

The real power of Infracost is seeing what a change costs. Generate a cost diff between your current state and proposed changes:

```bash
# First, generate a baseline from the main branch
git checkout main
infracost breakdown --path . --format json --out-file infracost-base.json

# Then, generate a diff from your feature branch
git checkout feature-branch
infracost diff --path . --compare-to infracost-base.json
```

The diff output highlights cost changes:

```
Project: main

+ aws_instance.web
  +- Instance usage (t3.large -> t3.xlarge)
     +$60.74 ($60.74 -> $121.47)

+ aws_rds_cluster.database
  ~ No cost changes

Monthly cost will increase by $60.74
+- From $267.94 to $328.68

+---------------------------+-------+---------+
| Project                   | Diff  | Total   |
+---------------------------+-------+---------+
| main                      | +$61  | $329    |
+---------------------------+-------+---------+
```

## Setting Cost Policies

Infracost supports policies that can block deployments based on cost thresholds. Create an `infracost.yml` policy file:

```yaml
# infracost.yml
version: 0.1

projects:
  - path: .

policies:
  # Fail if monthly cost exceeds the budget
  - name: max_monthly_cost
    description: Monthly cost must not exceed $5,000
    resource_type: "*"
    evaluation:
      monthly_cost:
        max: 5000

  # Warn if a single resource costs more than $500/month
  - name: expensive_resources
    description: Individual resources should not exceed $500/month
    resource_type: "*"
    evaluation:
      monthly_cost:
        max: 500
```

## GitHub Actions Integration

Post cost diffs as comments on pull requests:

```yaml
# .github/workflows/infracost.yml
name: Infracost

on:
  pull_request:
    paths:
      - '**/*.tf'
      - '**/*.tfvars'

jobs:
  infracost:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      # Generate cost for the base branch
      - name: Checkout base branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.ref }}
          path: base

      - name: Generate base cost
        run: |
          cd base
          terraform init
          infracost breakdown --path . --format json --out-file /tmp/infracost-base.json

      # Generate cost for the PR branch
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          path: pr

      - name: Generate PR cost diff
        run: |
          cd pr
          terraform init
          infracost diff --path . \
            --compare-to /tmp/infracost-base.json \
            --format json \
            --out-file /tmp/infracost-diff.json

      # Post comment on PR
      - name: Post Infracost comment
        run: |
          infracost comment github \
            --path /tmp/infracost-diff.json \
            --repo ${{ github.repository }} \
            --pull-request ${{ github.event.pull_request.number }} \
            --github-token ${{ github.token }} \
            --behavior update
```

This posts a comment like:

```
## Infracost Cost Estimate

| Project | Monthly Cost | Diff |
|---------|-------------|------|
| production | $328.68 | +$60.74 |

### Cost Breakdown
| Resource | Before | After | Diff |
|----------|--------|-------|------|
| aws_instance.web | $60.74 | $121.47 | +$60.74 |
| aws_rds_cluster.database | $180.20 | $180.20 | $0.00 |
```

## Usage-Based Cost Estimation

Some resources have usage-dependent costs (S3 requests, Lambda invocations, data transfer). Provide usage estimates in a YAML file:

```yaml
# infracost-usage.yml
version: 0.1

resource_usage:
  aws_s3_bucket.data:
    standard:
      storage_gb: 1000
      monthly_tier_1_requests: 100000      # PUT, COPY, POST requests
      monthly_tier_2_requests: 1000000     # GET, SELECT requests

  aws_lambda_function.api:
    monthly_requests: 5000000
    request_duration_ms: 100

  aws_dynamodb_table.sessions:
    monthly_write_request_units: 1000000
    monthly_read_request_units: 5000000
    storage_gb: 50

  aws_nat_gateway.main:
    monthly_data_processed_gb: 500

  aws_cloudfront_distribution.cdn:
    monthly_data_transfer_to_internet_gb:
      us: 500
      europe: 200
      asia_pacific: 100
    monthly_http_requests:
      us: 10000000
      europe: 5000000
```

Run with usage data:

```bash
infracost breakdown --path . --usage-file infracost-usage.yml
```

## Multi-Project Cost Tracking

For organizations with multiple Terraform projects, use Infracost's configuration file:

```yaml
# infracost.yml
version: 0.1

projects:
  - path: infrastructure/networking
    name: networking

  - path: infrastructure/compute
    name: compute

  - path: infrastructure/database
    name: database
    terraform_var_files:
      - production.tfvars
```

Run against all projects:

```bash
infracost breakdown --config-file infracost.yml
```

## Cost Thresholds in CI

Fail the CI pipeline if costs exceed a threshold:

```bash
#!/bin/bash
# cost-check.sh
# Fails if infrastructure costs exceed the budget

MAX_MONTHLY_COST=5000

# Generate cost breakdown
infracost breakdown --path . --format json --out-file cost.json

# Extract the total monthly cost
TOTAL_COST=$(jq '.totalMonthlyCost | tonumber' cost.json)

echo "Estimated monthly cost: \$$TOTAL_COST"

# Compare against the budget
if (( $(echo "$TOTAL_COST > $MAX_MONTHLY_COST" | bc -l) )); then
  echo "ERROR: Monthly cost (\$$TOTAL_COST) exceeds budget (\$$MAX_MONTHLY_COST)"
  echo "Review the cost breakdown and reduce resource sizes or request a budget increase."
  exit 1
fi

echo "OK: Cost is within budget"
```

## Cost Diff Thresholds

Block PRs that increase costs by more than a percentage:

```bash
#!/bin/bash
# cost-diff-check.sh
# Fails if cost increase exceeds 20%

MAX_INCREASE_PERCENT=20

# Generate diff
infracost diff --path . \
  --compare-to infracost-base.json \
  --format json \
  --out-file diff.json

# Calculate percentage increase
PAST_COST=$(jq '.pastTotalMonthlyCost | tonumber' diff.json)
NEW_COST=$(jq '.totalMonthlyCost | tonumber' diff.json)

if (( $(echo "$PAST_COST > 0" | bc -l) )); then
  INCREASE_PERCENT=$(echo "scale=2; (($NEW_COST - $PAST_COST) / $PAST_COST) * 100" | bc)
  echo "Cost change: ${INCREASE_PERCENT}%"

  if (( $(echo "$INCREASE_PERCENT > $MAX_INCREASE_PERCENT" | bc -l) )); then
    echo "ERROR: Cost increase (${INCREASE_PERCENT}%) exceeds maximum (${MAX_INCREASE_PERCENT}%)"
    exit 1
  fi
fi

echo "OK: Cost change is acceptable"
```

## Terraform Workspace Support

If you use Terraform workspaces, specify the workspace:

```bash
# Cost for a specific workspace
infracost breakdown --path . --terraform-workspace production

# Compare workspaces
infracost breakdown --path . --terraform-workspace staging --format json --out-file staging.json
infracost breakdown --path . --terraform-workspace production --format json --out-file production.json
```

## Output Formats

Infracost supports several output formats:

```bash
# Table format (default, human-readable)
infracost breakdown --path .

# JSON format (for programmatic processing)
infracost breakdown --path . --format json

# HTML format (for reports)
infracost breakdown --path . --format html --out-file report.html

# Slack message format
infracost breakdown --path . --format slack-message

# Diff output for PRs
infracost diff --path . --compare-to base.json --format diff
```

## Supported Resources

Infracost supports pricing for hundreds of resource types across AWS, Azure, and GCP. For resources it cannot price (like IAM roles or security groups that are free), it reports them as "$0.00" or skips them.

Check coverage for a specific provider:

```bash
# List supported resources
infracost breakdown --path . --show-skipped
```

## Best Practices

1. **Run Infracost on every PR.** Make cost visibility automatic, not optional. Developers should see cost impact before merging.

2. **Set realistic usage estimates.** Without usage data, Infracost can only estimate fixed costs. Add a usage file for resources with variable pricing.

3. **Start with warnings, then enforce.** Begin by posting cost comments on PRs. Once the team is comfortable, add thresholds that block merges.

4. **Track costs over time.** Use Infracost Cloud or export JSON data to track how your infrastructure costs evolve.

5. **Include cost review in your PR checklist.** Just like code review and security review, cost review should be a standard step.

Infracost makes infrastructure costs visible at the point where decisions are made - in the pull request. Combined with Terraform, it turns cost management from a monthly surprise into a continuous practice.

For complementary Terraform quality tools, see [How to Set Up Pre-Commit Hooks for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-pre-commit-hooks-for-terraform/view) and [How to Test Terraform Plans Before Applying](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-plans-before-applying/view).
