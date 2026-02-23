# How to Use State File Per Environment in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Environments, Infrastructure as Code, DevOps, Best Practices

Description: Learn how to implement a separate Terraform state file for each environment using workspaces, directory structures, and backend configuration to isolate dev, staging, and production infrastructure.

---

Running all your environments from a single Terraform state file is a recipe for disaster. A typo in a variable could destroy production resources when you meant to change something in dev. Separate state files per environment give you isolation, safety, and the ability to promote changes gradually from dev to staging to production.

This guide covers three approaches to per-environment state: directory-based separation, workspaces, and dynamic backend configuration. Each has trade-offs that suit different team sizes and complexity levels.

## Why Separate State Per Environment

A single state file for all environments creates several problems:

- **Blast radius.** An error in `terraform apply` affects every environment at once.
- **Lock contention.** Developers testing in dev block production deploys.
- **Drift between environments.** You cannot keep dev ahead of production for testing.
- **Access control.** Everyone who can modify dev can also modify production.
- **Recovery complexity.** Restoring state affects all environments, not just the broken one.

Separate state files solve all of these. Each environment has its own lifecycle, its own lock, and its own access policies.

## Approach 1: Directory-Based Separation

The simplest approach is giving each environment its own directory with a separate backend configuration:

```
terraform/
  modules/
    app/
      main.tf
      variables.tf
      outputs.tf
  environments/
    dev/
      main.tf
      backend.tf
      terraform.tfvars
    staging/
      main.tf
      backend.tf
      terraform.tfvars
    prod/
      main.tf
      backend.tf
      terraform.tfvars
```

Each environment uses the shared modules but has its own state:

```hcl
# environments/dev/backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# environments/dev/main.tf
module "app" {
  source = "../../modules/app"

  environment   = "dev"
  instance_type = "t3.small"
  instance_count = 1
  enable_monitoring = false
}
```

```hcl
# environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# environments/prod/main.tf
module "app" {
  source = "../../modules/app"

  environment   = "prod"
  instance_type = "t3.xlarge"
  instance_count = 3
  enable_monitoring = true
}
```

**Pros:** Clear separation, easy to understand, explicit per-environment config.
**Cons:** Some code duplication across environment directories.

## Approach 2: Terraform Workspaces

Workspaces let you use one configuration with multiple state files. Each workspace gets its own state file stored in the same backend:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```bash
# Create workspaces for each environment
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch between workspaces
terraform workspace select dev
terraform plan

terraform workspace select prod
terraform plan
```

Use `terraform.workspace` to vary configuration per environment:

```hcl
# main.tf - Configuration varies by workspace
locals {
  environment_config = {
    dev = {
      instance_type  = "t3.small"
      instance_count = 1
      monitoring     = false
    }
    staging = {
      instance_type  = "t3.medium"
      instance_count = 2
      monitoring     = true
    }
    prod = {
      instance_type  = "t3.xlarge"
      instance_count = 3
      monitoring     = true
    }
  }

  config = local.environment_config[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = var.ami_id
  instance_type = local.config.instance_type

  tags = {
    Name        = "app-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}
```

S3 stores workspace state under the `env:` prefix:

```
myorg-terraform-state/
  env:/
    dev/
      app/terraform.tfstate
    staging/
      app/terraform.tfstate
    prod/
      app/terraform.tfstate
```

**Pros:** No code duplication, easy workspace switching.
**Cons:** Less flexibility per environment, risk of applying to wrong workspace, all config in one place.

## Approach 3: Dynamic Backend Configuration

This approach uses a single codebase with backend configuration injected at init time:

```hcl
# backend.tf - Parameterized backend
terraform {
  backend "s3" {
    # Values provided at init time
  }
}
```

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Target environment"
}
```

Create per-environment backend configs and variable files:

```hcl
# config/dev.backend.hcl
bucket         = "myorg-terraform-state"
key            = "dev/app/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"
```

```hcl
# config/dev.tfvars
environment    = "dev"
instance_type  = "t3.small"
instance_count = 1
```

```bash
# Initialize with environment-specific backend
terraform init -backend-config=config/dev.backend.hcl

# Plan with environment-specific variables
terraform plan -var-file=config/dev.tfvars
```

Wrap it in a script for convenience:

```bash
#!/bin/bash
# tf.sh - Terraform wrapper with environment selection

set -euo pipefail

ENV=$1
shift  # Remove environment from arguments, pass the rest to Terraform
ACTION=$1
shift

# Re-initialize if the environment changed
if [ ! -f ".terraform/environment" ] || [ "$(cat .terraform/environment 2>/dev/null)" != "$ENV" ]; then
  terraform init -reconfigure -backend-config="config/${ENV}.backend.hcl"
  echo "$ENV" > .terraform/environment
fi

# Run Terraform with the environment's variables
terraform "$ACTION" -var-file="config/${ENV}.tfvars" "$@"
```

```bash
# Usage
./tf.sh dev plan
./tf.sh staging apply
./tf.sh prod plan -target=module.database
```

**Pros:** Single codebase, flexible, works well with CI/CD.
**Cons:** Easy to forget `-backend-config` or `-var-file` flags.

## Per-Environment IAM Policies

Different environments should have different access levels:

```hcl
# iam.tf - Restrict production state access
resource "aws_iam_policy" "dev_terraform" {
  name = "terraform-dev-access"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject"]
        Resource = "arn:aws:s3:::myorg-terraform-state/dev/*"
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-locks"
      }
    ]
  })
}

resource "aws_iam_policy" "prod_terraform" {
  name = "terraform-prod-access"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject"]
        Resource = "arn:aws:s3:::myorg-terraform-state/prod/*"
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-locks"
        # Additional condition for prod: require MFA
        Condition = {
          Bool = { "aws:MultiFactorAuthPresent" = "true" }
        }
      }
    ]
  })
}
```

## Promoting Changes Across Environments

With separate state per environment, you can promote changes safely:

```bash
# Step 1: Apply to dev
./tf.sh dev apply

# Step 2: Test in dev, then apply to staging
./tf.sh staging plan   # Review the plan
./tf.sh staging apply

# Step 3: Test in staging, then apply to prod
./tf.sh prod plan      # Careful review of the plan
./tf.sh prod apply     # Apply during maintenance window
```

In CI/CD, automate the promotion:

```yaml
# .github/workflows/terraform.yml
jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          terraform init -backend-config=config/dev.backend.hcl
          terraform apply -auto-approve -var-file=config/dev.tfvars

  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          terraform init -backend-config=config/staging.backend.hcl
          terraform apply -auto-approve -var-file=config/staging.tfvars

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - run: |
          terraform init -backend-config=config/prod.backend.hcl
          terraform apply -auto-approve -var-file=config/prod.tfvars
```

## Choosing the Right Approach

| Criteria | Directory-Based | Workspaces | Dynamic Backend |
|----------|----------------|------------|-----------------|
| Code duplication | Some | None | None |
| Environment clarity | High | Medium | Medium |
| Flexibility | High | Low | High |
| Team size | Any | Small | Medium to Large |
| CI/CD integration | Easy | Moderate | Easy |

For most teams, the directory-based approach or dynamic backend configuration works best. Workspaces are fine for small projects with minimal per-environment differences.

## Best Practices

1. **Never share state between environments.** This is the most important rule.
2. **Use identical module versions** across environments to maintain consistency.
3. **Promote changes in order** - dev, then staging, then production.
4. **Restrict production access** to a smaller group of engineers or CI/CD pipelines.
5. **Use the same backend type** across environments for consistency.
6. **Name state keys to match environments** for easy identification.
7. **Test destroy in dev regularly** to verify your configuration handles the full lifecycle.

Separate state files per environment are a fundamental practice for any production Terraform setup. The small overhead of maintaining the separation pays for itself the first time it prevents a dev change from hitting production.
