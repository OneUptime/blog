# How to Use Infracost for IaC Cost Estimation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infracost, FinOps, Terraform, Cost Estimation, Infrastructure as Code

Description: Learn how to use Infracost to estimate infrastructure costs from Terraform code with CI/CD integration and pull request comments.

---

Infrastructure costs can spiral out of control when developers provision resources without visibility into pricing. Infracost solves this by analyzing your Terraform code and showing cost estimates before you deploy. This guide walks through installing Infracost, generating cost scans, and integrating it into your CI/CD pipeline.

## What is Infracost?

Infracost is an open-source tool that estimates cloud costs from Infrastructure as Code (IaC). It parses IaC projects locally and calculates monthly costs based on cloud provider pricing data. The tool supports AWS, Azure, Google Cloud, and over 1,000 Terraform resources.

```mermaid
flowchart LR
    A[Terraform Code] --> B[Infracost CLI]
    B --> C[Cloud Pricing API]
    C --> D[Cost Breakdown]
    D --> E[PR Comment / Report]
```

## Installing Infracost

Install the Infracost CLI on your development machine. The tool is available for macOS, Linux, and Windows.

### macOS with Homebrew

```bash
# Install Infracost using Homebrew package manager

brew install infracost

# Verify the installation succeeded
infracost --version
```

### Linux

```bash
# Download and run the official installation script
# This installs the latest version to /usr/local/bin
curl -fsSL https://raw.githubusercontent.com/infracost/cli/master/scripts/install.sh | sh

# Verify installation
infracost --version
```

### Register for an Account

Infracost requires you to authenticate so it can fetch cloud pricing data. Register and authenticate:

```bash
# Register or sign in to Infracost
# This opens a browser and saves your session locally
infracost auth login
```

The saved session is included automatically in future commands.

## Generating Your First Cost Estimate

Navigate to a directory containing Terraform files and run the scan command.

### Example Terraform Configuration

Here is a simple AWS infrastructure setup to demonstrate cost estimation:

`main.tf`

```hcl
# Configure the AWS provider
# Infracost will use this region for pricing data
provider "aws" {
  region = "us-east-1"
}

# EC2 instance - Infracost calculates hourly cost * 730 hours/month
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"  # 2 vCPU, 4 GB RAM

  # EBS root volume pricing is calculated separately
  root_block_device {
    volume_size = 50  # 50 GB gp3 volume
    volume_type = "gp3"
  }

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}

# RDS instance - includes compute, storage, and IOPS costs
resource "aws_db_instance" "database" {
  identifier        = "app-database"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"   # 2 vCPU, 4 GB RAM
  allocated_storage = 100              # 100 GB storage
  storage_type      = "gp3"

  # Multi-AZ doubles the cost for high availability
  multi_az          = true

  username          = "admin"
  password          = "changeme123"    # Use secrets manager in production
  skip_final_snapshot = true
}

# S3 bucket - costs depend on storage class and request volume
resource "aws_s3_bucket" "assets" {
  bucket = "myapp-assets-bucket"
}

# NAT Gateway - fixed hourly cost plus data processing charges
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = "subnet-12345678"
}

resource "aws_eip" "nat" {
  domain = "vpc"
}
```

### Run Cost Scan

Generate a cost scan for the Terraform directory:

```bash
# Run infracost scan on the current directory
infracost scan

# Show the most expensive resources from the latest scan
infracost inspect --top 10
```

Sample output:

```text
Project: .

ADDRESS                    TYPE                    MONTHLY_COST
aws_db_instance.database   aws_db_instance             $131.22
aws_nat_gateway.main       aws_nat_gateway              $32.85
aws_instance.web           aws_instance                 $30.37
aws_eip.nat                aws_eip                       $3.65
```

## Comparing Costs Between Branches

One of the most powerful features is comparing costs between your current state and proposed changes in pull requests. This helps catch expensive modifications before they reach production.

```mermaid
flowchart TB
    subgraph "Cost Comparison Flow"
        A[Main Branch] --> B[Scan Baseline]
        C[Feature Branch] --> D[Scan Proposed Changes]
        B --> E[Infracost PR analysis]
        D --> E
        E --> F[Cost Difference Report]
    end
```

### Generate Baseline Costs

For local checks, scan your main branch:

```bash
# Checkout main branch and scan baseline costs
git checkout main

# Cache cost results for the main branch
infracost scan
infracost inspect --summary
```

### Compare with Feature Branch

Switch to your feature branch and scan again:

```bash
# Checkout your feature branch with infrastructure changes
git checkout feature/add-redis-cluster

# Review the updated cost summary and most expensive resources
infracost scan
infracost inspect --summary
infracost inspect --top 10
```

In CI/CD pull request comments, the cost diff will look similar to this:

```text
Project: .

+ aws_elasticache_replication_group.redis
  ├─ ElastiCache (cache.r6g.large)              +$234.52
  └─ Backup storage                       Monthly cost depends on usage

Monthly cost will increase by $234.52

──────────────────────────────────
Key: + added, ~ changed, - removed
```

## Integrating with GitHub Actions

Automate cost estimation on every pull request. Infracost can post comments showing the cost impact of proposed changes.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant CI as GitHub Actions
    participant IC as Infracost Cloud

    Dev->>GH: Open Pull Request
    GH->>CI: Trigger Workflow
    CI->>CI: Generate Terraform Plan
    CI->>IC: Upload Cost Data
    IC->>GH: Post PR Comment
    Dev->>GH: Review Cost Impact
```

### GitHub Actions Workflow

Create a workflow file to run Infracost on pull requests:

`.github/workflows/infracost.yml`

```yaml
# Infracost workflow for pull request cost estimation
# Posts a comment on each PR showing infrastructure cost changes
name: Infracost

on:
  pull_request:
    paths:
      - '**.tf'           # Run when Terraform files change
      - '**.tfvars'       # Run when variable files change

jobs:
  infracost:
    name: Infracost Analysis
    runs-on: ubuntu-latest

    permissions:
      contents: read       # Read repository contents
      pull-requests: write # Post PR comments

    env:
      TF_ROOT: ./terraform  # Path to Terraform files in your repo

    steps:
      # Check out the repository so Infracost can access Terraform files
      - name: Checkout repository
        uses: actions/checkout@v4

      # Install the Infracost CLI tool
      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      # Generate baseline costs from the main branch
      # This is used for comparison against the PR changes
      - name: Checkout base branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.ref }}
          path: base

      - name: Generate Infracost baseline
        run: |
          # Generate cost breakdown for the base branch
          infracost breakdown \
            --path base/${{ env.TF_ROOT }} \
            --format json \
            --out-file /tmp/infracost-base.json

      # Generate costs for the PR branch and compare
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          path: pr

      - name: Generate Infracost diff
        run: |
          # Compare PR branch costs against baseline
          # Output in JSON format for the comment action
          infracost diff \
            --path pr/${{ env.TF_ROOT }} \
            --compare-to /tmp/infracost-base.json \
            --format json \
            --out-file /tmp/infracost-diff.json

      # Post the cost comparison as a PR comment
      # Updates existing comment on subsequent pushes
      - name: Post PR comment
        run: |
          infracost comment github \
            --path /tmp/infracost-diff.json \
            --repo $GITHUB_REPOSITORY \
            --github-token ${{ github.token }} \
            --pull-request ${{ github.event.pull_request.number }} \
            --behavior update
```

### Required Secrets

Add these secrets to your GitHub repository:

1. `INFRACOST_API_KEY` - Your Infracost API key from registration
2. AWS/Azure/GCP credentials if Terraform needs provider authentication

## GitLab CI Integration

For GitLab users, add this job to your pipeline:

`.gitlab-ci.yml`

```yaml
# Infracost job for merge request cost estimation
infracost:
  stage: test
  image:
    name: infracost/infracost:ci-0.10
    entrypoint: ['']

  # Only run on merge requests to avoid unnecessary API calls
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

  variables:
    # Path to your Terraform configuration
    TF_ROOT: ${CI_PROJECT_DIR}/terraform

  script:
    # Fetch the target branch for baseline comparison
    - git fetch origin $CI_MERGE_REQUEST_TARGET_BRANCH_NAME

    # Generate baseline costs from target branch
    - git checkout $CI_MERGE_REQUEST_TARGET_BRANCH_NAME
    - |
      infracost breakdown \
        --path $TF_ROOT \
        --format json \
        --out-file /tmp/infracost-base.json

    # Switch back to source branch
    - git checkout $CI_COMMIT_SHA

    # Generate diff and output for GitLab
    - |
      infracost diff \
        --path $TF_ROOT \
        --compare-to /tmp/infracost-base.json \
        --format json \
        --out-file /tmp/infracost-diff.json

    # Post comment to merge request using GitLab API
    - |
      infracost comment gitlab \
        --path /tmp/infracost-diff.json \
        --repo $CI_PROJECT_PATH \
        --merge-request $CI_MERGE_REQUEST_IID \
        --gitlab-server-url $CI_SERVER_URL \
        --gitlab-token $GITLAB_TOKEN \
        --behavior update
```

## Setting Cost Policies

Infracost supports FinOps policies and cost guardrails through Infracost Cloud. For custom CI/CD policy checks, you can also use Open Policy Agent (OPA) policies with Infracost JSON output.

### Policy File

Create an OPA policy file to define cost limits:

`infracost-policy.rego`

```rego
package infracost

deny[out] {
  max_diff := 500
  diff := to_number(input.diffTotalMonthlyCost)
  out := {
    "failed": diff > max_diff,
    "msg": sprintf("Monthly cost increase must be $%d or less; proposed increase is $%.2f.", [max_diff, diff]),
  }
}
```

### Running with Policies

Apply the policy when posting the pull request comment:

```bash
# Evaluate the OPA policy against Infracost JSON in CI
infracost comment github \
  --path /tmp/infracost-diff.json \
  --repo $GITHUB_REPOSITORY \
  --github-token $GITHUB_TOKEN \
  --pull-request $PR_NUMBER \
  --behavior update \
  --policy-path infracost-policy.rego

# Exit code will be non-zero if the policy fails
echo "Exit code: $?"
```

## Cost Usage Estimation

Some resources have usage-based pricing that Infracost cannot determine from Terraform alone. You can provide usage estimates for more accurate projections.

### Usage File

Create a usage file with expected consumption:

`infracost-usage.yml`

```yaml
# Usage estimates for resources with consumption-based pricing
# These values supplement the static Terraform configuration
version: 0.1

resource_usage:
  # S3 bucket usage estimates
  aws_s3_bucket.assets:
    # Storage estimates in GB
    standard:
      storage_gb: 500                 # 500 GB of standard storage

    # Request estimates per month
    monthly_tier_1_requests: 100000   # PUT, COPY, POST, LIST requests
    monthly_tier_2_requests: 1000000  # GET, SELECT requests

  # NAT Gateway data processing
  aws_nat_gateway.main:
    monthly_data_processed_gb: 500    # 500 GB through NAT gateway

  # Lambda function usage
  aws_lambda_function.api:
    monthly_requests: 5000000         # 5 million invocations
    request_duration_ms: 200          # Average 200ms per invocation

  # RDS additional backup storage
  aws_db_instance.database:
    additional_backup_storage_gb: 50  # 50 GB backup retention
```

### Run with Usage File

With the current CLI, reference the usage file from `infracost.yml` so scans pick it up:

`infracost.yml`

```yaml
version: "0.3"

usage_file: infracost-usage.yml

projects:
  - path: .
```

Then run a scan:

```bash
# Generate estimates with usage-based cost estimates
# The usage_file setting includes your consumption projections
infracost scan
```

## Architecture Overview

Here is how Infracost fits into a typical infrastructure workflow:

```mermaid
flowchart TB
    subgraph "Development"
        A[Write Terraform] --> B[Local Testing]
        B --> C[infracost scan]
        C --> D{Cost OK?}
        D -->|Yes| E[Push to Git]
        D -->|No| A
    end

    subgraph "CI/CD Pipeline"
        E --> F[Pull Request]
        F --> G[Terraform Plan]
        G --> H[Infracost Analysis]
        H --> I[Post PR Comment]
        I --> J{Review}
        J -->|Approve| K[Merge]
        J -->|Request Changes| A
    end

    subgraph "Production"
        K --> L[Terraform Apply]
        L --> M[Infrastructure Deployed]
        M --> N[Actual Costs]
    end
```

## Best Practices

### 1. Run Locally Before Pushing

Always check costs on your machine before opening a pull request:

```bash
# Quick local check before committing
infracost scan
```

### 2. Use Terragrunt Support

Infracost supports Terragrunt:

```bash
# Run on Terragrunt configurations
# Infracost automatically detects terragrunt.hcl files
infracost scan ./live/production
```

### 3. Generate Multiple Formats

Export costs in different formats for reporting:

```bash
# JSON for programmatic processing
infracost scan --json > costs.json

# Summary for stakeholders
infracost inspect --summary
```

### 4. Cache Infracost Data

Speed up CI runs by caching Infracost's local data:

```yaml
# GitHub Actions caching example
- name: Cache Infracost data
  uses: actions/cache@v4
  with:
    path: ~/.config/infracost
    key: infracost-pricing-${{ runner.os }}
```

### 5. Set Up Alerts

Configure Infracost Cloud to alert when costs exceed thresholds and run a scan so results are available:

```bash
# Scan the project and review policy or guardrail failures
infracost scan
infracost inspect --failing
```

## Troubleshooting

### Missing Resource Costs

If a resource shows "Monthly cost depends on usage," provide a usage file with estimates or check if the resource type is supported:

```bash
# Show per-project diagnostics from the latest scan
infracost inspect --diagnostics
```

### Authentication Errors

Ensure your account authentication is configured:

```bash
# Check current configuration
infracost auth whoami

# Re-authenticate if needed
infracost auth login
```

### Terraform Version Mismatch

Check the Terraform version available in your environment if parsing fails because a different Terraform version is on your `PATH`:

```bash
# Check the Terraform version that will be used by your shell
terraform version

# Update PATH or your version manager, then rerun the scan
infracost scan
```

## Conclusion

Infracost brings cost visibility into your infrastructure development workflow. By estimating costs from Terraform code, you catch expensive changes before they reach production. The CI/CD integration ensures every pull request includes cost impact, making FinOps a natural part of code review.

Start with local scans to understand your current infrastructure costs, then add the GitHub Actions or GitLab CI integration to automate cost checks on every pull request. Use policies to enforce guardrails and usage files for accurate consumption-based estimates.

The shift-left approach to cloud costs saves money and prevents surprises in your monthly bill.
