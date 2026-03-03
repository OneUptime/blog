# How to Use Terragrunt for Feature Branch Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Feature Branches, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to use Terragrunt to create and destroy ephemeral infrastructure environments for feature branches, enabling isolated testing before merging to main.

---

Feature branch environments let developers spin up isolated copies of infrastructure for testing before merging. Instead of sharing a single dev environment where changes from multiple engineers can collide, each feature branch gets its own stack. Terragrunt makes this manageable by letting you parameterize environment names and state paths dynamically.

## The Concept

When a developer creates a feature branch called `feature/add-auth`, the CI pipeline automatically provisions a complete environment just for that branch. When the branch is merged or deleted, the environment is torn down. Each environment gets:

- Its own Terraform state file (no state conflicts)
- Its own resources (no resource naming collisions)
- Its own DNS entry or URL for testing

## Directory Structure

You don't need a separate directory for each feature branch. Instead, use a template that's parameterized by the branch name:

```text
infrastructure/
  terragrunt.hcl              # Root config
  _envcommon/
    vpc.hcl                   # Shared VPC config
    app.hcl                   # Shared app config
    database.hcl              # Shared database config
  environments/
    dev/
      env.hcl
      vpc/terragrunt.hcl
      app/terragrunt.hcl
    feature/                  # Feature branch template
      env.hcl
      vpc/terragrunt.hcl
      app/terragrunt.hcl
      database/terragrunt.hcl
```

## Dynamic Environment Naming

The key is parameterizing the environment name using an environment variable:

```hcl
# infrastructure/environments/feature/env.hcl

locals {
  # Read the branch name from an environment variable
  # Sanitize it to be safe for resource names
  branch_name = replace(
    replace(
      lower(get_env("BRANCH_NAME", "unknown")),
      "/", "-"
    ),
    "_", "-"
  )

  # Truncate to avoid hitting resource name length limits
  environment = "feat-${substr(local.branch_name, 0, min(length(local.branch_name), 20))}"
}
```

## Dynamic State Path

Each feature branch needs its own state file to avoid conflicts:

```hcl
# Root terragrunt.hcl

locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-company-terraform-state"
    # Include the environment name in the state key
    key            = "${local.environment}/${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

With this setup, the branch `feature/add-auth` produces state keys like:
- `feat-add-auth/vpc/terraform.tfstate`
- `feat-add-auth/app/terraform.tfstate`
- `feat-add-auth/database/terraform.tfstate`

## Resource Naming

Resources need unique names to avoid conflicts with other feature branches:

```hcl
# infrastructure/environments/feature/vpc/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

include "vpc_common" {
  path   = "${get_repo_root()}/_envcommon/vpc.hcl"
  expose = true
}

locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_vars.locals.environment
}

inputs = {
  # Unique VPC name per branch
  vpc_name = "${local.environment}-vpc"
  vpc_cidr = "10.100.0.0/16"

  tags = {
    Environment  = local.environment
    FeatureBranch = get_env("BRANCH_NAME", "unknown")
    Ephemeral    = "true"
  }
}
```

## Cost Optimization for Feature Environments

Feature environments should be cheap. Use smaller instance types and fewer redundant resources:

```hcl
# infrastructure/environments/feature/app/terragrunt.hcl

inputs = {
  instance_type      = "t3.small"       # Smaller than dev/prod
  desired_count      = 1                 # Single instance
  min_size           = 1
  max_size           = 1
  enable_autoscaling = false
  multi_az           = false             # Single AZ to save costs

  # Skip expensive components not needed for testing
  enable_waf         = false
  enable_cloudfront  = false
}
```

## CI/CD Pipeline for Feature Branches

Here's a GitHub Actions workflow that creates and destroys feature environments:

```yaml
# .github/workflows/feature-environment.yml
name: Feature Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    paths:
      - 'src/**'
      - 'infrastructure/**'

env:
  TF_IN_AUTOMATION: true
  BRANCH_NAME: ${{ github.head_ref }}

jobs:
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Tools
        run: |
          # Install Terraform and Terragrunt
          # ... (setup steps)

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy Feature Environment
        working-directory: infrastructure/environments/feature
        run: |
          export BRANCH_NAME="${{ github.head_ref }}"
          terragrunt run-all apply \
            --terragrunt-non-interactive \
            -auto-approve

      - name: Post Environment URL
        uses: actions/github-script@v7
        with:
          script: |
            const branch = '${{ github.head_ref }}'.replace(/[\/\_]/g, '-').toLowerCase().substring(0, 20);
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Feature environment deployed: https://feat-${branch}.dev.example.com`
            });

  destroy:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Tools
        run: |
          # Install Terraform and Terragrunt

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Destroy Feature Environment
        working-directory: infrastructure/environments/feature
        run: |
          export BRANCH_NAME="${{ github.head_ref }}"
          terragrunt run-all destroy \
            --terragrunt-non-interactive \
            -auto-approve

      - name: Clean State Files
        run: |
          # Remove state files for the destroyed environment
          BRANCH_SLUG=$(echo "${{ github.head_ref }}" | sed 's/[\/\_]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-20)
          aws s3 rm "s3://my-company-terraform-state/feat-${BRANCH_SLUG}/" --recursive
```

## Shared Dependencies

Feature environments often share some infrastructure with the dev environment to reduce costs. For example, the VPC and database might be shared while the application layer is unique:

```hcl
# Feature branch app module - depends on shared dev VPC
dependency "vpc" {
  config_path = "../../dev/vpc"    # Use dev VPC, not a branch-specific one
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids

  # Only the app is branch-specific
  app_name   = "feat-${local.branch_name}-app"
}
```

## TTL and Automatic Cleanup

Feature environments that aren't cleaned up waste money. Add a TTL mechanism:

```hcl
# Tag resources with creation time for cleanup
inputs = {
  tags = {
    Ephemeral    = "true"
    CreatedAt    = timestamp()
    TTLHours     = "72"
    FeatureBranch = get_env("BRANCH_NAME", "unknown")
  }
}
```

Then run a scheduled job to find and destroy stale environments:

```bash
#!/bin/bash
# scripts/cleanup-stale-environments.sh

# Find state files older than 72 hours
STALE_ENVS=$(aws s3 ls s3://my-company-terraform-state/feat- | \
  awk '{print $1, $2, $NF}' | \
  while read date time prefix; do
    created=$(date -d "$date $time" +%s)
    now=$(date +%s)
    age_hours=$(( (now - created) / 3600 ))
    if [ $age_hours -gt 72 ]; then
      echo "$prefix"
    fi
  done)

for env in $STALE_ENVS; do
  echo "Destroying stale environment: $env"
  BRANCH_NAME="${env#feat-}"
  export BRANCH_NAME
  cd infrastructure/environments/feature
  terragrunt run-all destroy --terragrunt-non-interactive -auto-approve
done
```

## DNS for Feature Environments

Give each feature branch a subdomain:

```hcl
# Feature branch DNS module
inputs = {
  domain_name = "feat-${local.branch_name}.dev.example.com"
  zone_id     = dependency.dns_zone.outputs.zone_id
  target      = dependency.alb.outputs.dns_name
}
```

## Summary

Feature branch environments with Terragrunt boil down to three things: parameterized naming (using environment variables for the branch name), isolated state files (include the branch name in the state key), and automated lifecycle management (create on PR open, destroy on PR close). Keep feature environments minimal to control costs, and always tag resources as ephemeral so they can be cleaned up. For more on CI/CD integration, see our [Terragrunt with GitHub Actions guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-github-actions/view).
