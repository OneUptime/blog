# How to Use Infracost for Cost Estimation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infracost, Cost Estimation, FinOps, Infrastructure as Code, DevOps

Description: Learn how to integrate Infracost with OpenTofu to get cloud cost estimates before applying changes - surfacing cost impact directly in pull requests and CI/CD pipelines.

## Introduction

Infracost integrates with OpenTofu workflows to show the cost impact of infrastructure changes before `tofu apply`. Engineers see the cost impact of their changes in pull requests, enabling cost-aware decisions without leaving the development workflow.

## Installing Infracost

```bash
# macOS

brew install infracost

# Linux
curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh

# Authenticate with the Infracost cloud API
infracost auth login

infracost --version
```

## Getting Your First Cost Estimate

```bash
# Run against an OpenTofu directory
infracost breakdown --path .

# Run against a specific plan file
tofu init
tofu plan -out=tfplan.binary
tofu show -json -plan=tfplan.binary > tfplan.json
infracost breakdown --path tfplan.json --format table
```

Sample output:

```text
Name                                    Quantity  Unit         Monthly Cost
aws_instance.web_server
  Instance usage (Linux/UNIX)           730       hours        $33.58
  root_block_device
    Storage (general purpose SSD, gp3)  20        GB-months    $1.60

aws_db_instance.postgres
  Database instance (db.t3.medium)      730       hours        $52.56
  Storage (gp2)                         100       GB-months    $11.50

TOTAL                                                          $99.24
```

## Comparing Costs: Before vs After

The most powerful feature is `diff` - shows the cost change for proposed modifications:

```bash
# Compare current state (main branch) with changes (feature branch)
git checkout main
infracost breakdown --path . --format json --out-file infracost-base.json

git checkout -
infracost diff --path . --compare-to infracost-base.json
```

```text
Monthly cost change for .
  Before: $99.24
  After:  $187.45
  Change: +$88.21 (+89%)

+ aws_instance.web_server  instance_type: t3.small → t3.xlarge  +$88.21
```

## GitHub Actions Integration

```yaml
# .github/workflows/infracost.yml
name: Infracost Cost Estimate

on:
  pull_request:

jobs:
  infracost:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      # Generate cost estimate for the base branch
      - name: Checkout base branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.ref }}

      - name: Infracost for base branch
        run: |
          infracost breakdown --path . \
            --format json \
            --out-file /tmp/infracost-base.json

      # Generate cost diff for the PR branch
      - name: Checkout PR branch
        uses: actions/checkout@v4

      - name: Infracost diff for PR
        run: |
          infracost diff \
            --path . \
            --compare-to /tmp/infracost-base.json \
            --format json \
            --out-file /tmp/infracost-diff.json

      # Post the cost estimate as a PR comment
      - name: Post Infracost comment
        run: |
          infracost comment github \
            --path /tmp/infracost-diff.json \
            --repo ${{ github.repository }} \
            --pull-request ${{ github.event.pull_request.number }} \
            --github-token ${{ secrets.GITHUB_TOKEN }} \
            --behavior update
```

## infracost.yml Configuration File

```yaml
# infracost.yml - project-level configuration
version: 0.1

projects:
  - path: environments/production
    name: production
    terraform_var_files:
      - terraform.tfvars

  - path: environments/staging
    name: staging
    terraform_var_files:
      - terraform.tfvars
```

Run with config:

```bash
infracost breakdown --config-file infracost.yml
```

## Setting Cost Thresholds

Block PRs that exceed a cost threshold:

```bash
# Get the monthly cost increase as a number
COST_INCREASE=$(infracost diff \
  --path . \
  --compare-to /tmp/infracost-base.json \
  --format json | jq '.diffTotalMonthlyCost | tonumber')

# Fail if increase exceeds $100/month
if (( $(echo "$COST_INCREASE > 100" | bc -l) )); then
  echo "ERROR: Monthly cost increase of \$$COST_INCREASE exceeds \$100 threshold"
  exit 1
fi
```

## Conclusion

Infracost makes cloud costs visible in the development workflow - before infrastructure is deployed. By posting cost diffs on pull requests, engineers see the financial impact of their changes alongside code review. Set cost thresholds in CI to block unexpectedly expensive changes and integrate `infracost.yml` to track costs across multiple environments.
