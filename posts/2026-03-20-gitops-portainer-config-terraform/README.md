# How to Set Up GitOps for Portainer Configuration with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, GitOps, Infrastructure as Code, CI/CD

Description: Learn how to manage Portainer configuration as code in a Git repository, with automated Terraform applies via CI/CD.

## The GitOps Approach for Portainer

GitOps applies to Portainer configuration itself - not just the workloads it manages. Store your Terraform code in Git, and use CI/CD to automatically apply Portainer configuration changes when merged to the main branch.

## Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── terraform.yml
└── portainer-config/
    ├── environments/
    │   ├── production.tf
    │   ├── staging.tf
    │   └── development.tf
    ├── users/
    │   ├── users.tf
    │   └── teams.tf
    ├── registries/
    │   └── registries.tf
    ├── stacks/
    │   ├── monitoring.tf
    │   └── application.tf
    ├── provider.tf
    ├── versions.tf
    └── variables.tf
```

## Provider Configuration

```hcl
# provider.tf

terraform {
  required_providers {
    portainer = {
      source  = "portainer/portainer"
      version = "~> 1.0"
    }
  }

  # Store Terraform state remotely for CI/CD-driven GitOps
  backend "s3" {
    bucket = "mycompany-terraform-state"
    key    = "portainer/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "portainer" {
  endpoint = var.portainer_url
  api_key  = var.portainer_api_key
}
```

## GitHub Actions Workflow for Terraform GitOps

```yaml
# .github/workflows/terraform.yml
name: Portainer Configuration

on:
  push:
    branches: [main]
    paths: ['portainer-config/**']
  pull_request:
    branches: [main]
    paths: ['portainer-config/**']

permissions:
  contents: read
  issues: write

jobs:
  terraform:
    name: Terraform
    runs-on: ubuntu-latest
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    defaults:
      run:
        working-directory: portainer-config

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v4
        with:
          terraform_version: 1.14.8

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        env:
          TF_VAR_portainer_url: ${{ secrets.PORTAINER_URL }}
          TF_VAR_portainer_api_key: ${{ secrets.PORTAINER_API_KEY }}
        run: terraform plan -no-color

      # Post plan output as PR comment
      - name: Comment Plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v9
        env:
          PLAN: ${{ steps.plan.outputs.stdout }}
        with:
          script: |
            const body = [
              '## Terraform Plan',
              '```',
              process.env.PLAN,
              '```'
            ].join('\n');

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });

      # Only apply on main branch
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        env:
          TF_VAR_portainer_url: ${{ secrets.PORTAINER_URL }}
          TF_VAR_portainer_api_key: ${{ secrets.PORTAINER_API_KEY }}
        run: terraform apply -auto-approve
```

## Managing Sensitive Variables Securely

```hcl
# variables.tf
variable "portainer_url" {
  description = "Portainer server URL"
  type        = string
}

variable "portainer_api_key" {
  description = "Portainer API key"
  type        = string
  sensitive   = true  # Redacted from logs
}

variable "registry_passwords" {
  description = "Map of registry names to passwords"
  type        = map(string)
  sensitive   = true
}
```

## Branch Strategy

```text
main          ← Production Portainer config (auto-applied)
feature/*     ← Developer changes (plan-only, no apply)
```

## Pull Request Review Checklist

Before merging a Portainer config PR:
- [ ] Terraform plan shows expected changes only.
- [ ] No unexpected resource deletions.
- [ ] Sensitive values are using variables (not hardcoded).
- [ ] New environments have been tested in staging first.

## Conclusion

GitOps for Portainer configuration brings the same benefits as GitOps for application deployments: every change is reviewed, version-controlled, and automatically applied. This eliminates configuration drift and ensures your Portainer setup is always in sync with what's defined in code.
