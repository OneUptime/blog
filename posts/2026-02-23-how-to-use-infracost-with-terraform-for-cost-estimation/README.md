# How to Use Infracost with Terraform for Cost Estimation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infracost, Cost Estimation, FinOps, Cloud Cost Management

Description: Learn how to use Infracost with Terraform to estimate cloud infrastructure costs before deploying, enabling proactive cost management and budget control.

---

Cloud infrastructure costs can spiral quickly when teams deploy resources without visibility into pricing. Infracost solves this by showing you the cost impact of Terraform changes before you apply them. This guide covers how to install, configure, and use Infracost with your Terraform projects for accurate cost estimation.

## What Is Infracost?

Infracost is an open-source tool that estimates the monthly cost of Terraform configurations. It parses your Terraform plan output, maps resources to cloud provider pricing, and generates detailed cost breakdowns. It supports AWS, Azure, and GCP resources and integrates with CI/CD pipelines to show cost changes on pull requests.

## Installing Infracost

```bash
# macOS
brew install infracost

# Linux
curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh

# Docker
docker pull infracost/infracost
```

Register for a free API key:

```bash
# Register and configure the API key
infracost auth login

# Or set it manually
infracost configure set api_key YOUR_API_KEY
```

## Basic Usage

Run Infracost against your Terraform configuration:

```bash
# Generate a cost breakdown
infracost breakdown --path .

# Output example:
# Name                                     Monthly Qty  Unit   Monthly Cost
#
# aws_instance.web
#   - Linux/UNIX usage (on-demand, t3.large)    730  hours        $60.74
#   - root_block_device
#     - Storage (general purpose SSD, gp3)        50  GB            $4.00
#
# aws_db_instance.primary
#   - Database instance (on-demand, db.r5.large) 730  hours       $172.80
#   - Storage (general purpose SSD, gp2)         100  GB            $11.50
#
# OVERALL TOTAL                                                   $249.04
```

## Comparing Costs Between Changes

The most powerful feature is comparing costs between the current and proposed infrastructure:

```bash
# Generate a cost diff
infracost diff --path .

# Output shows what changes cost
# + aws_instance.api
#   + Linux/UNIX usage (on-demand, t3.medium)    730  hours    $30.37
#
# ~ aws_instance.web
#   ~ Linux/UNIX usage (on-demand, t3.large -> t3.xlarge)
#                                                 730  hours    +$60.74
#
# Monthly cost will increase by $91.11 (from $249.04 to $340.15)
```

## Using Infracost with Terraform Plan

For the most accurate estimates, use a Terraform plan file:

```bash
# Generate a Terraform plan
terraform plan -out=tfplan.binary

# Convert to JSON
terraform show -json tfplan.binary > plan.json

# Run Infracost against the plan
infracost breakdown --path plan.json
```

## Configuration File

Create an `infracost.yml` for project-specific settings:

```yaml
# infracost.yml
version: 0.1

projects:
  - path: environments/production
    name: Production Infrastructure
    terraform_var_files:
      - terraform.tfvars
    terraform_vars:
      environment: production

  - path: environments/staging
    name: Staging Infrastructure
    terraform_var_files:
      - terraform.tfvars

  - path: modules/compute
    name: Compute Module
    terraform_vars:
      instance_count: 5
      instance_type: t3.large
```

Run against the configuration file:

```bash
infracost breakdown --config-file infracost.yml
```

## Understanding Cost Output

Infracost provides detailed breakdowns:

```bash
# Detailed output with all components
infracost breakdown --path . --show-skipped

# JSON output for programmatic use
infracost breakdown --path . --format json > costs.json

# HTML report
infracost breakdown --path . --format html > cost-report.html

# Table format (default)
infracost breakdown --path . --format table
```

## Usage-Based Cost Estimation

Some resources have usage-based pricing. Provide usage estimates:

```yaml
# infracost-usage.yml
version: 0.1

resource_usage:
  aws_lambda_function.api:
    monthly_requests: 1000000
    request_duration_ms: 250

  aws_s3_bucket.data:
    standard:
      storage_gb: 500
      monthly_tier_1_requests: 100000
      monthly_tier_2_requests: 500000

  aws_dynamodb_table.app:
    monthly_write_request_units: 1000000
    monthly_read_request_units: 5000000
    storage_gb: 25

  aws_nat_gateway.main:
    monthly_data_processed_gb: 100
```

```bash
# Run with usage estimates
infracost breakdown --path . --usage-file infracost-usage.yml
```

## Cost Policies

Set cost thresholds to catch expensive changes:

```bash
# Fail if monthly cost exceeds a threshold
infracost breakdown --path . --format json | \
  jq -e '.totalMonthlyCost | tonumber < 1000' || \
  echo "WARNING: Monthly cost exceeds $1000"

# Check cost increase percentage
infracost diff --path . --format json | \
  jq -e '.diffTotalMonthlyCost | tonumber < 100' || \
  echo "WARNING: Cost increase exceeds $100/month"
```

## Multi-Project Cost Summary

Get a consolidated view across multiple projects:

```bash
# Generate individual breakdowns
infracost breakdown --path environments/production --format json > prod-costs.json
infracost breakdown --path environments/staging --format json > staging-costs.json

# Combine into a summary
infracost output --path "prod-costs.json" --path "staging-costs.json" --format table
```

## Integrating with Terraform Workflow

Add Infracost to your standard Terraform workflow:

```bash
#!/bin/bash
# terraform-with-costs.sh
# Wrapper that shows costs alongside Terraform plan

echo "=== Terraform Plan ==="
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > plan.json

echo ""
echo "=== Cost Estimation ==="
infracost breakdown --path plan.json

echo ""
echo "=== Cost Difference ==="
infracost diff --path plan.json

echo ""
read -p "Proceed with apply? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  terraform apply tfplan.binary
else
  echo "Apply cancelled."
fi
```

## Best Practices

Run Infracost on every pull request to catch cost increases early. Provide usage estimates for resources with usage-based pricing. Set cost thresholds to alert on significant increases. Review the cost breakdown before approving any Terraform apply. Use the configuration file for multi-project setups. Keep Infracost updated for the latest pricing data. Compare costs between environments to identify optimization opportunities.

## Conclusion

Infracost brings cost visibility to your Terraform workflow, enabling teams to make informed decisions about infrastructure changes. By running cost estimates before applying changes, you can prevent budget surprises and optimize cloud spending. Whether used locally or integrated into CI/CD pipelines, Infracost is an essential tool for any team managing cloud infrastructure with Terraform.

For related guides, see [How to Set Up Infracost in CI/CD Pipelines for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-infracost-in-cicd-pipelines-for-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
