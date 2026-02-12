# How to Use Terragrunt for DRY Terraform AWS Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Terragrunt, DevOps, Infrastructure

Description: Learn how Terragrunt eliminates repetition in multi-environment Terraform setups by providing DRY backend configuration, shared variables, and dependency management.

---

Terraform is great at defining infrastructure, but it's not great at managing multiple environments. When you have dev, staging, and production, you end up copying backend configuration, provider blocks, and common variables across every environment directory. Terragrunt wraps Terraform and solves this repetition problem.

Think of Terragrunt as a thin orchestration layer on top of Terraform. It generates the boilerplate, manages dependencies between modules, and keeps your configuration DRY (Don't Repeat Yourself).

## The Problem Terragrunt Solves

Without Terragrunt, a multi-environment setup looks like this.

```
environments/
  dev/
    backend.tf        # S3 bucket, DynamoDB table, key = "dev/..."
    provider.tf       # region = "us-east-1"
    main.tf           # module "vpc" { source = "../../modules/vpc" ... }
    variables.tf      # Same variables as staging and prod
    terraform.tfvars  # Different values per environment
  staging/
    backend.tf        # Same S3 bucket, key = "staging/..."
    provider.tf       # Same provider config
    main.tf           # Same module calls
    variables.tf      # Same variable definitions
    terraform.tfvars  # Different values
  production/
    backend.tf        # Same S3 bucket, key = "production/..."
    provider.tf       # Same provider config
    main.tf           # Same module calls
    variables.tf      # Same variable definitions
    terraform.tfvars  # Different values
```

That's a lot of duplicated files. With Terragrunt, it looks like this.

```
terragrunt.hcl          # Root config with shared backend and provider
environments/
  dev/
    terragrunt.hcl      # Just the dev-specific values
  staging/
    terragrunt.hcl      # Just the staging-specific values
  production/
    terragrunt.hcl      # Just the production-specific values
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
```

## Installing Terragrunt

```bash
# macOS
brew install terragrunt

# Linux
curl -L https://github.com/gruntwork-io/terragrunt/releases/latest/download/terragrunt_linux_amd64 \
  -o /usr/local/bin/terragrunt
chmod +x /usr/local/bin/terragrunt

# Verify installation
terragrunt --version
```

## Root Configuration

The root `terragrunt.hcl` defines shared settings that apply to all environments.

```hcl
# terragrunt.hcl (at the repository root)

# Generate the backend configuration for every environment
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "my-company-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}

# Generate the provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
EOF
}
```

The magic is in `${path_relative_to_include()}`. This generates a unique state key based on the directory path. So `environments/dev` gets the state key `environments/dev/terraform.tfstate`, and `environments/production` gets `environments/production/terraform.tfstate`.

## Environment Configuration

Each environment directory has a minimal `terragrunt.hcl` that specifies what's different.

```hcl
# environments/dev/terragrunt.hcl

# Include the root configuration
include "root" {
  path = find_in_parent_folders()
}

# Point to the Terraform module
terraform {
  source = "../../modules/vpc"
}

# Environment-specific inputs
inputs = {
  environment = "dev"
  aws_region  = "us-east-1"
  vpc_cidr    = "10.0.0.0/16"

  azs = ["us-east-1a", "us-east-1b"]

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # Save money in dev
}
```

```hcl
# environments/production/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/vpc"
}

inputs = {
  environment = "production"
  aws_region  = "us-east-1"
  vpc_cidr    = "10.0.0.0/16"

  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false  # HA in production
  one_nat_gateway_per_az = true
}
```

## Running Terragrunt

Terragrunt commands mirror Terraform commands.

```bash
# Plan a specific environment
cd environments/dev
terragrunt plan

# Apply
terragrunt apply

# Destroy
terragrunt destroy

# Plan all environments at once (from the repository root)
terragrunt run-all plan

# Apply all environments
terragrunt run-all apply
```

## Multi-Component Architecture

Real infrastructure has multiple components - networking, database, compute. Terragrunt handles dependencies between them.

```
environments/
  dev/
    networking/
      terragrunt.hcl
    database/
      terragrunt.hcl
    compute/
      terragrunt.hcl
  production/
    networking/
      terragrunt.hcl
    database/
      terragrunt.hcl
    compute/
      terragrunt.hcl
```

### Networking Component

```hcl
# environments/dev/networking/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  environment = "dev"
  aws_region  = "us-east-1"
  vpc_cidr    = "10.0.0.0/16"
  # ... networking-specific inputs
}
```

### Database Component (Depends on Networking)

```hcl
# environments/dev/database/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/rds"
}

# Declare dependency on networking
dependency "networking" {
  config_path = "../networking"
}

inputs = {
  environment = "dev"
  aws_region  = "us-east-1"

  # Use outputs from the networking module
  vpc_id             = dependency.networking.outputs.vpc_id
  database_subnet_ids = dependency.networking.outputs.database_subnet_ids

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.t3.medium"
}
```

### Compute Component (Depends on Networking and Database)

```hcl
# environments/dev/compute/terragrunt.hcl

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/ecs"
}

dependency "networking" {
  config_path = "../networking"
}

dependency "database" {
  config_path = "../database"
}

inputs = {
  environment = "dev"
  aws_region  = "us-east-1"

  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.private_subnet_ids

  db_endpoint = dependency.database.outputs.endpoint
  db_port     = dependency.database.outputs.port
}
```

When you run `terragrunt run-all apply` from the `dev` directory, Terragrunt figures out the dependency order and applies networking first, then database, then compute.

## Shared Variables with Common Includes

Extract common variables to avoid repetition across environments.

```hcl
# common/env.hcl
locals {
  aws_region = "us-east-1"

  common_tags = {
    ManagedBy = "terraform"
    Project   = "my-app"
  }
}
```

```hcl
# environments/dev/terragrunt.hcl
locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("common/env.hcl"))
  environment = "dev"
}

include "root" {
  path = find_in_parent_folders()
}

inputs = {
  aws_region  = local.env_vars.locals.aws_region
  environment = local.environment
  tags        = merge(local.env_vars.locals.common_tags, {
    Environment = local.environment
  })
}
```

## Hooks

Run commands before or after Terraform operations.

```hcl
terraform {
  source = "../../modules/vpc"

  before_hook "validate" {
    commands = ["apply", "plan"]
    execute  = ["tflint", "--config", ".tflint.hcl"]
  }

  after_hook "notify" {
    commands     = ["apply"]
    execute      = ["bash", "-c", "echo 'Deploy complete for ${path_relative_to_include()}'"]
    run_on_error = false
  }
}
```

## Preventing Accidental Destroys

Terragrunt has a built-in protection against accidental destroys.

```hcl
# In the root terragrunt.hcl
terraform {
  # Prompt before destroy
  prevent_destroy = true
}
```

For production environments specifically:

```hcl
# environments/production/terragrunt.hcl
terraform {
  source = "../../modules/vpc"

  extra_arguments "prevent_destroy" {
    commands = ["destroy"]
    arguments = ["-lock=true"]
  }
}
```

## CI/CD with Terragrunt

Integrate Terragrunt into your pipeline.

```yaml
# GitHub Actions example
name: Terragrunt Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false  # Required for Terragrunt

      - name: Setup Terragrunt
        run: |
          curl -L https://github.com/gruntwork-io/terragrunt/releases/latest/download/terragrunt_linux_amd64 -o terragrunt
          chmod +x terragrunt
          sudo mv terragrunt /usr/local/bin/

      - name: Deploy Dev
        run: |
          cd environments/dev
          terragrunt run-all apply --terragrunt-non-interactive
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

For more CI/CD patterns, see our guides on [Terraform CI/CD with GitHub Actions](https://oneuptime.com/blog/post/terraform-cicd-github-actions-for-aws/view) and [GitLab CI](https://oneuptime.com/blog/post/terraform-cicd-gitlab-ci-for-aws/view).

## Wrapping Up

Terragrunt shines when you have multiple environments with similar infrastructure. It eliminates the copy-paste problem, manages cross-module dependencies, and keeps your configuration DRY. Start by moving your backend configuration to the root `terragrunt.hcl`, then gradually extract common patterns.

The learning curve is worth it if you manage more than two environments or have dependencies between infrastructure components.

For the state backend that Terragrunt configures, see our guide on [Terraform state with S3 and DynamoDB](https://oneuptime.com/blog/post/terraform-state-with-s3-backend-and-dynamodb-locking/view).
