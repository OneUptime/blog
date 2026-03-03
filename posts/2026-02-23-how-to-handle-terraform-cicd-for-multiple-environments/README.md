# How to Handle Terraform CI/CD for Multiple Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Multiple Environments, Workspace, DevOps, Infrastructure as Code

Description: Learn how to manage Terraform CI/CD pipelines across multiple environments including dev, staging, and production using workspaces, directory structures, and promotion workflows.

---

Most teams need at least three environments: development, staging, and production. Each environment should mirror the others in structure but differ in size, cost, and access controls. Managing these environments through Terraform CI/CD requires a consistent approach to code organization, variable management, and promotion workflows. This guide covers the proven patterns.

## Approaches to Multi-Environment Terraform

There are three main approaches:

1. **Terraform Workspaces** - Same code, different state files
2. **Directory-per-environment** - Separate directories with shared modules
3. **Variable files per environment** - Same directory, different `.tfvars`

Each has tradeoffs. Here is when to use which.

## Approach 1: Terraform Workspaces

Workspaces let you manage multiple environments from a single configuration:

```hcl
# main.tf - Configuration that adapts per workspace
locals {
  env_config = {
    dev = {
      instance_type  = "t3.small"
      instance_count = 1
      db_instance    = "db.t3.small"
      multi_az       = false
    }
    staging = {
      instance_type  = "t3.medium"
      instance_count = 2
      db_instance    = "db.t3.medium"
      multi_az       = false
    }
    production = {
      instance_type  = "t3.large"
      instance_count = 3
      db_instance    = "db.r6g.large"
      multi_az       = true
    }
  }

  config = local.env_config[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = data.aws_ami.app.id
  instance_type = local.config.instance_type

  tags = {
    Name        = "app-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

resource "aws_db_instance" "main" {
  instance_class = local.config.db_instance
  multi_az       = local.config.multi_az
  identifier     = "app-${terraform.workspace}"

  tags = {
    Environment = terraform.workspace
  }
}
```

CI/CD pipeline with workspaces:

```yaml
# .github/workflows/terraform-workspaces.yml
name: Terraform Multi-Environment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
      max-parallel: 1  # Deploy sequentially: dev, then staging, then production

    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-${{ matrix.environment }}
          aws-region: us-east-1

      - name: Terraform Apply - ${{ matrix.environment }}
        run: |
          terraform init -no-color
          terraform workspace select ${{ matrix.environment }} || terraform workspace new ${{ matrix.environment }}
          terraform apply -no-color -auto-approve
```

## Approach 2: Directory Per Environment

This is the most explicit and arguably the safest approach:

```text
infrastructure/
  modules/
    app/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf

  environments/
    dev/
      main.tf       # Uses modules with dev-specific values
      backend.tf    # Separate state file
      variables.tf
      terraform.tfvars

    staging/
      main.tf
      backend.tf
      variables.tf
      terraform.tfvars

    production/
      main.tf
      backend.tf
      variables.tf
      terraform.tfvars
```

```hcl
# environments/dev/main.tf
module "app" {
  source = "../../modules/app"

  environment    = "dev"
  instance_type  = "t3.small"
  instance_count = 1
}

module "database" {
  source = "../../modules/database"

  environment    = "dev"
  instance_class = "db.t3.small"
  multi_az       = false
}
```

```hcl
# environments/production/main.tf
module "app" {
  source = "../../modules/app"

  environment    = "production"
  instance_type  = "t3.large"
  instance_count = 3
}

module "database" {
  source = "../../modules/database"

  environment    = "production"
  instance_class = "db.r6g.large"
  multi_az       = true
}
```

CI/CD with directory per environment:

```yaml
# .github/workflows/terraform-environments.yml
name: Terraform Deploy

on:
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      dev: ${{ steps.filter.outputs.dev }}
      staging: ${{ steps.filter.outputs.staging }}
      production: ${{ steps.filter.outputs.production }}

    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            dev:
              - 'environments/dev/**'
              - 'modules/**'
            staging:
              - 'environments/staging/**'
              - 'modules/**'
            production:
              - 'environments/production/**'
              - 'modules/**'

  deploy-dev:
    needs: detect-changes
    if: needs.detect-changes.outputs.dev == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy dev
        run: |
          cd environments/dev
          terraform init -no-color
          terraform apply -no-color -auto-approve

  deploy-staging:
    needs: [detect-changes, deploy-dev]
    if: needs.detect-changes.outputs.staging == 'true'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy staging
        run: |
          cd environments/staging
          terraform init -no-color
          terraform apply -no-color -auto-approve

  deploy-production:
    needs: [detect-changes, deploy-staging]
    if: needs.detect-changes.outputs.production == 'true'
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      - name: Deploy production
        run: |
          cd environments/production
          terraform init -no-color
          terraform apply -no-color -auto-approve
```

## Approach 3: Variable Files Per Environment

A middle ground that keeps one directory with environment-specific `.tfvars` files:

```text
infrastructure/
  main.tf
  variables.tf
  backend.tf
  envs/
    dev.tfvars
    staging.tfvars
    production.tfvars
```

```hcl
# envs/dev.tfvars
environment    = "dev"
instance_type  = "t3.small"
instance_count = 1
db_instance    = "db.t3.small"
multi_az       = false
```

```hcl
# envs/production.tfvars
environment    = "production"
instance_type  = "t3.large"
instance_count = 3
db_instance    = "db.r6g.large"
multi_az       = true
```

```yaml
# CI/CD pipeline with tfvars files
jobs:
  deploy:
    strategy:
      matrix:
        environment: [dev, staging, production]
      max-parallel: 1

    steps:
      - name: Deploy ${{ matrix.environment }}
        run: |
          terraform init -no-color \
            -backend-config="key=${{ matrix.environment }}/terraform.tfstate"
          terraform apply -no-color -auto-approve \
            -var-file="envs/${{ matrix.environment }}.tfvars"
```

## Promotion Workflow

A promotion workflow ensures changes are tested in lower environments before reaching production:

```yaml
# .github/workflows/promote.yml
name: Environment Promotion

on:
  workflow_dispatch:
    inputs:
      target:
        description: "Environment to promote to"
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  validate-source:
    runs-on: ubuntu-latest
    steps:
      - name: Verify source environment is healthy
        run: |
          if [ "${{ inputs.target }}" = "staging" ]; then
            SOURCE="dev"
          else
            SOURCE="staging"
          fi

          echo "Verifying $SOURCE environment health before promoting to ${{ inputs.target }}"

          # Run Terraform plan on source to confirm no drift
          cd environments/$SOURCE
          terraform init -no-color
          terraform plan -detailed-exitcode -no-color

  deploy-target:
    needs: validate-source
    runs-on: ubuntu-latest
    environment: ${{ inputs.target }}

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to ${{ inputs.target }}
        run: |
          cd environments/${{ inputs.target }}
          terraform init -no-color
          terraform apply -no-color -auto-approve

      - name: Run smoke tests
        run: |
          ENDPOINT=$(cd environments/${{ inputs.target }} && terraform output -raw app_endpoint)
          curl -f "$ENDPOINT/health" || exit 1
          echo "Smoke tests passed for ${{ inputs.target }}"
```

## Separate AWS Accounts Per Environment

For strong isolation, use different AWS accounts:

```hcl
# environments/dev/backend.tf
terraform {
  backend "s3" {
    bucket         = "dev-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    # Dev account
    role_arn       = "arn:aws:iam::111111111111:role/terraform-state"
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "prod-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    # Production account
    role_arn       = "arn:aws:iam::333333333333:role/terraform-state"
    dynamodb_table = "terraform-locks"
  }
}
```

```yaml
# CI/CD with different AWS accounts per environment
jobs:
  deploy:
    strategy:
      matrix:
        include:
          - environment: dev
            role_arn: arn:aws:iam::111111111111:role/terraform-cicd
          - environment: staging
            role_arn: arn:aws:iam::222222222222:role/terraform-cicd
          - environment: production
            role_arn: arn:aws:iam::333333333333:role/terraform-cicd

    steps:
      - name: Configure AWS credentials for ${{ matrix.environment }}
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ matrix.role_arn }}
          aws-region: us-east-1
```

## Environment Parity Checks

Verify that environments do not drift apart structurally:

```bash
#!/bin/bash
# scripts/check-parity.sh
# Compare Terraform resource counts across environments

for env in dev staging production; do
  echo "=== $env ==="
  cd environments/$env
  terraform init -no-color > /dev/null 2>&1
  terraform state list | wc -l
  terraform state list | sed 's/\[.*\]/[*]/' | sort -u
  cd ../..
done
```

## Summary

Managing multiple environments in Terraform CI/CD comes down to choosing the right isolation strategy. Workspaces work for simple setups. Directory-per-environment gives you explicit control and clear separation. Variable files are a compromise. Whichever approach you pick, ensure your pipeline deploys sequentially through environments with appropriate approval gates, and verify each environment before promoting changes to the next one.

For more on deployment strategies, see our guides on [matrix strategies for multi-environment Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-matrix-strategies-for-multi-environment-terraform-cicd/view) and [implementing GitOps with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-gitops-with-terraform/view).
