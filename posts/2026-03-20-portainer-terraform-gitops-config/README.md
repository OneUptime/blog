# How to Set Up GitOps for Portainer Configuration with Terraform (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, GitOps, Infrastructure, CI/CD

Description: Learn how to implement GitOps for Portainer itself using Terraform, so changes to your Portainer configuration are managed through Git pull requests and automated CI/CD pipelines.

## Introduction

GitOps for Portainer means that your Portainer configuration - environments, users, teams, stacks, and access policies - is stored in Git and applied automatically. Changes are proposed via pull requests, reviewed by teammates, and applied by a CI/CD pipeline. This creates an auditable, collaborative workflow for infrastructure management.

## Prerequisites

- Portainer Terraform provider
- GitHub or GitLab repository for Terraform configuration
- Terraform Cloud (or S3/GCS backend for state)
- CI/CD runner with Terraform installed

## Step 1: Repository Structure

```text
portainer-infra/
├── .github/
│   └── workflows/
│       ├── plan.yml         # Run terraform plan on PRs
│       └── apply.yml        # Run terraform apply on merge
├── environments/
│   ├── production/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars # Non-sensitive config
│   └── staging/
│       ├── main.tf
│       └── terraform.tfvars
├── modules/
│   ├── portainer-environment/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── portainer-stack/
│       ├── main.tf
│       └── variables.tf
├── stacks/
│   ├── monitoring/
│   │   └── docker-compose.yml
│   └── application/
│       └── docker-compose.yml
└── README.md
```

## Step 2: Configure Remote State

```hcl
# environments/production/main.tf

terraform {
  required_version = ">= 1.10"

  required_providers {
    portainer = {
      source  = "portainer/portainer"
      version = "~> 1.0"
    }
  }

  # Use S3 backend for state (or Terraform Cloud)
  backend "s3" {
    bucket       = "my-terraform-state"
    key          = "portainer/production/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "portainer" {
  endpoint        = var.portainer_url
  api_key         = var.portainer_api_key
  skip_ssl_verify = false
}
```

## Step 3: Create Reusable Modules

```hcl
# modules/portainer-environment/main.tf

variable "name" { type = string }
variable "url"  { type = string }
variable "type" { type = number; default = 1 }
variable "tls"  { type = bool; default = false }
variable "group_id" { type = number; default = 1 }
variable "tag_ids"  { type = list(number); default = [] }

resource "portainer_environment" "this" {
  name                = var.name
  environment_address = var.url
  type                = var.type
  tls_enabled         = var.tls
  group_id            = var.group_id
  tag_ids             = var.tag_ids
}

output "id" { value = portainer_environment.this.id }
```

Use the module:

```hcl
# environments/production/main.tf

module "prod_docker" {
  source = "../../modules/portainer-environment"

  name     = "production-docker"
  url      = "tcp://192.168.1.100:2376"
  type     = 1
  tls      = true
  group_id = 1
}

module "prod_k8s" {
  source = "../../modules/portainer-environment"

  name = "production-kubernetes"
  url  = "https://kubernetes.example.com:6443"
  type = 5
}
```

## Step 4: GitHub Actions - Plan on PR

```yaml
# .github/workflows/plan.yml

name: Terraform Plan

on:
  pull_request:
    paths:
      - 'environments/**/*.tf'
      - 'environments/**/*.tfvars'
      - 'modules/**/*.tf'
      - 'stacks/**/*.yml'

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    strategy:
      matrix:
        environment: [production, staging]

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.14.5"

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Plan
        id: plan
        shell: bash
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform plan -var="portainer_api_key=$PORTAINER_API_KEY" \
            -no-color -out=tfplan 2>&1 | tee plan-output.txt
        env:
          PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Comment PR with plan
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('environments/${{ matrix.environment }}/plan-output.txt', 'utf8');
            const body = [
              '## Terraform Plan - ${{ matrix.environment }}',
              '```',
              plan.slice(-3000),
              '```',
            ].join('\n');

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });
```

## Step 5: GitHub Actions - Apply on Merge

```yaml
# .github/workflows/apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'environments/**/*.tf'
      - 'environments/**/*.tfvars'
      - 'modules/**/*.tf'
      - 'stacks/**/*.yml'

jobs:
  apply:
    runs-on: ubuntu-latest
    environment: portainer-production  # Can require manual approval if required reviewers are configured

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.14.5"

      - name: Terraform Init
        working-directory: environments/production
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Apply
        working-directory: environments/production
        run: terraform apply -auto-approve -var="portainer_api_key=$PORTAINER_API_KEY"
        env:
          PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Step 6: Drift Detection

```yaml
# .github/workflows/drift-check.yml
name: Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.14.5"

      - name: Check for drift
        shell: bash
        working-directory: environments/production
        run: |
          terraform init
          set +e
          PLAN=$(terraform plan -var="portainer_api_key=$PORTAINER_API_KEY" \
            -detailed-exitcode -no-color 2>&1)
          EXIT_CODE=$?
          set -e

          if [ $EXIT_CODE -eq 2 ]; then
            echo "DRIFT DETECTED!"
            echo "$PLAN"
            # Send alert via Slack/PagerDuty
          elif [ $EXIT_CODE -eq 0 ]; then
            echo "No drift detected."
          else
            echo "$PLAN"
            exit $EXIT_CODE
          fi
        env:
          PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Conclusion

GitOps for Portainer configuration with Terraform creates a fully auditable, collaborative infrastructure management process. Every change to Portainer - whether adding a new environment, provisioning users, or deploying a stack - goes through a PR review process with automated `terraform plan` output. Drift detection ensures your actual Portainer state stays aligned with your declared configuration. This approach scales well for large teams and multi-environment setups.
