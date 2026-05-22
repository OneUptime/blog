# How to Use Infracost with Terraform for Cost Estimation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infracost, Cost Estimation, FinOps, Cloud Cost Management

Description: Learn how to use Infracost with Terraform to estimate cloud infrastructure costs before deploying, enabling proactive cost management and budget control.

---

Cloud infrastructure costs can spiral quickly when teams deploy resources without visibility into pricing. Infracost solves this by showing you the cost impact of Terraform changes before you apply them. This guide covers how to install, configure, and use Infracost with your Terraform projects for accurate cost estimation.

## What Is Infracost?

Infracost is an open-source tool that estimates the monthly cost of Terraform configurations. It scans your infrastructure-as-code, maps resources to cloud provider pricing, and generates detailed cost breakdowns. It supports AWS, Azure, and GCP resources and integrates with CI/CD pipelines to show cost changes on pull requests.

## Installing Infracost

```bash
# macOS

brew install infracost

# Linux
curl -fsSL https://raw.githubusercontent.com/infracost/cli/master/scripts/install.sh | sh

# Windows
choco install infracost
```

Log in to Infracost:

```bash
# Browser-based login
infracost auth login

# For CI/CD, set a service account or personal access token
export INFRACOST_CLI_AUTHENTICATION_TOKEN=YOUR_TOKEN
```

## Basic Usage

Run Infracost against your Terraform configuration:

```bash
# Generate a cost breakdown
infracost scan

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

The most powerful feature is comparing costs between the current and proposed infrastructure in pull requests:

```bash
# Connect your repository so pull requests show cost changes
infracost ci setup

# Pull request comments show what changes cost
# + aws_instance.api
#   + Linux/UNIX usage (on-demand, t3.medium)    730  hours    $30.37
#
# ~ aws_instance.web
#   ~ Linux/UNIX usage (on-demand, t3.large -> t3.xlarge)
#                                                 730  hours    +$60.74
#
# Monthly cost will increase by $91.11 (from $249.04 to $340.15)
```

## Using Infracost with Terraform Projects

The current Infracost CLI scans Terraform project directories directly:

```bash
# Scan the current Terraform project
infracost scan

# Scan a specific Terraform project
infracost scan environments/production
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
# Run from the repository root; Infracost auto-discovers infracost.yml
infracost scan
```

## Understanding Cost Output

Infracost provides detailed breakdowns:

```bash
# Scan the project first
infracost scan

# Summary output
infracost inspect --summary

# JSON output for programmatic use
infracost inspect --summary --json > costs.json

# Show the top 10 resources by cost
infracost inspect --top 10
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

Reference the usage file from `infracost.yml`:

```yaml
version: "0.3"

usage_file: infracost-usage.yml

projects:
  - path: .
```

```bash
# Run with usage estimates
infracost scan
```

## Cost Policies

Use budgets and guardrails to catch expensive changes:

```bash
# List configured cost budgets
infracost budgets

# List configured cost guardrails
infracost guardrails
```

## Multi-Project Cost Summary

Get a consolidated view across multiple projects:

```bash
# Scan from the repository root
infracost scan

# Summarize costs by project
infracost inspect --group-by project
```

## Integrating with Terraform Workflow

Add Infracost to your standard Terraform workflow:

```bash
#!/bin/bash
# terraform-with-costs.sh
# Wrapper that shows costs alongside Terraform plan

echo "=== Terraform Plan ==="
terraform plan -out=tfplan.binary

echo ""
echo "=== Cost Estimation ==="
infracost scan

echo ""
echo "=== Cost Summary ==="
infracost inspect --summary

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
