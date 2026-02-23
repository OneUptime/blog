# How to Handle State Files in Mono-Repo Terraform Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Mono-Repo, Infrastructure as Code, DevOps, Project Structure

Description: Learn how to organize and manage Terraform state files in mono-repo projects with multiple environments, teams, and components sharing a single repository.

---

Mono-repos are popular for Terraform projects because they keep all infrastructure code in one place. But as the repository grows, managing state files becomes increasingly complex. You need a strategy that isolates state between environments and components while still allowing cross-references and shared modules.

This guide covers practical patterns for organizing state files in mono-repo Terraform projects, from simple setups to large-scale multi-team architectures.

## The Mono-Repo Challenge

A typical mono-repo Terraform project has multiple environments (dev, staging, prod), multiple components (networking, databases, compute), and multiple teams working in the same repository. Each combination needs its own state file to prevent one team's changes from interfering with another's.

Without proper state isolation, you risk:
- A development change accidentally modifying production infrastructure.
- Slow plan and apply times because the state file contains thousands of resources.
- Lock contention when multiple teams try to apply changes simultaneously.
- Blast radius issues where a single bad apply affects everything.

## Directory Structure

The most common pattern organizes code by environment and component:

```
infrastructure/
  modules/                    # Shared modules
    vpc/
    rds/
    ecs/
  environments/
    dev/
      networking/
        main.tf
        backend.tf
        variables.tf
      database/
        main.tf
        backend.tf
        variables.tf
      compute/
        main.tf
        backend.tf
        variables.tf
    staging/
      networking/
      database/
      compute/
    prod/
      networking/
      database/
      compute/
```

Each leaf directory is a separate Terraform root module with its own state file. This gives you:
- Independent state per component and environment.
- Fine-grained access control.
- Small blast radius per apply.

## Backend Configuration Per Component

Each component directory has its own backend configuration:

```hcl
# environments/prod/networking/backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# environments/prod/database/backend.tf
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "prod/database/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Using a consistent naming convention for state keys makes it easy to find and manage state files. The pattern `{environment}/{component}/terraform.tfstate` maps directly to the directory structure.

## Partial Backend Configuration

To avoid duplicating backend settings across dozens of directories, use partial backend configuration:

```hcl
# environments/prod/networking/backend.tf
terraform {
  backend "s3" {
    # Only specify the unique key here
    key = "prod/networking/terraform.tfstate"
  }
}
```

Then pass common settings during init:

```bash
# init.sh - Shared backend configuration
terraform init \
  -backend-config="bucket=myorg-terraform-state" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="dynamodb_table=terraform-locks"
```

Or use a shared backend config file:

```hcl
# backend-config/prod.hcl
bucket         = "myorg-terraform-state"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"
```

```bash
terraform init -backend-config=../../backend-config/prod.hcl
```

## Cross-Component References

Components in a mono-repo often need to reference each other. The networking component creates a VPC, and the compute component needs the VPC ID. Use `terraform_remote_state` for these cross-references:

```hcl
# environments/prod/compute/data.tf
# Read outputs from the networking component
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "myorg-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use networking outputs
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

Create a helper module to standardize these references:

```hcl
# modules/state-ref/main.tf
variable "environment" {
  type = string
}

variable "component" {
  type = string
}

data "terraform_remote_state" "ref" {
  backend = "s3"

  config = {
    bucket = "myorg-terraform-state"
    key    = "${var.environment}/${var.component}/terraform.tfstate"
    region = "us-east-1"
  }
}

output "outputs" {
  value = data.terraform_remote_state.ref.outputs
}
```

```hcl
# environments/prod/compute/main.tf
module "networking_ref" {
  source      = "../../../modules/state-ref"
  environment = "prod"
  component   = "networking"
}

module "database_ref" {
  source      = "../../../modules/state-ref"
  environment = "prod"
  component   = "database"
}
```

## Dependency Ordering

When components depend on each other, you need to apply them in the right order. Document dependencies explicitly:

```bash
#!/bin/bash
# apply-environment.sh - Apply components in dependency order

set -euo pipefail

ENVIRONMENT=$1

# Define the dependency order
COMPONENTS=(
  "networking"    # No dependencies
  "database"      # Depends on networking
  "compute"       # Depends on networking and database
  "monitoring"    # Depends on compute
)

for component in "${COMPONENTS[@]}"; do
  echo "Applying $ENVIRONMENT/$component..."
  cd "environments/$ENVIRONMENT/$component"
  terraform init -backend-config="../../backend-config/$ENVIRONMENT.hcl"
  terraform apply -auto-approve
  cd -
done
```

## Makefile for Mono-Repo Operations

A Makefile simplifies common operations:

```makefile
# Makefile
ENV ?= dev
COMPONENT ?= networking
BACKEND_CONFIG = environments/backend-config/$(ENV).hcl
WORKING_DIR = environments/$(ENV)/$(COMPONENT)

.PHONY: init plan apply destroy

init:
	cd $(WORKING_DIR) && terraform init -backend-config=../../backend-config/$(ENV).hcl

plan:
	cd $(WORKING_DIR) && terraform plan

apply:
	cd $(WORKING_DIR) && terraform apply

destroy:
	cd $(WORKING_DIR) && terraform destroy

# Apply all components for an environment in order
apply-all:
	$(MAKE) apply ENV=$(ENV) COMPONENT=networking
	$(MAKE) apply ENV=$(ENV) COMPONENT=database
	$(MAKE) apply ENV=$(ENV) COMPONENT=compute
	$(MAKE) apply ENV=$(ENV) COMPONENT=monitoring

# Format all Terraform files
fmt:
	terraform fmt -recursive environments/
	terraform fmt -recursive modules/
```

Usage:

```bash
# Plan networking in prod
make plan ENV=prod COMPONENT=networking

# Apply database in staging
make apply ENV=staging COMPONENT=database

# Apply everything in dev
make apply-all ENV=dev
```

## CI/CD for Mono-Repos

Configure CI/CD to only run Terraform for components that changed:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths:
      - 'environments/**'
      - 'modules/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      changed_components: ${{ steps.changes.outputs.components }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - id: changes
        run: |
          # Find which environment/component directories changed
          changed=$(git diff --name-only origin/main...HEAD | \
            grep '^environments/' | \
            cut -d'/' -f2,3 | \
            sort -u | \
            jq -R -s 'split("\n") | map(select(length > 0))')
          echo "components=$changed" >> $GITHUB_OUTPUT

  plan:
    needs: detect-changes
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: ${{ fromJson(needs.detect-changes.outputs.changed_components) }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        run: |
          ENV=$(echo "${{ matrix.component }}" | cut -d'/' -f1)
          COMP=$(echo "${{ matrix.component }}" | cut -d'/' -f2)
          cd "environments/$ENV/$COMP"
          terraform init -backend-config="../../backend-config/$ENV.hcl"
          terraform plan -no-color
```

## Scaling Considerations

As your mono-repo grows beyond 10-20 components, consider these patterns:

**Use Terragrunt** to reduce boilerplate:

```hcl
# environments/prod/networking/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  environment = "prod"
  cidr_block  = "10.0.0.0/16"
}
```

**Split the mono-repo** if different teams are constantly stepping on each other. A mono-repo per team or per business domain can reduce friction while keeping related infrastructure together.

**Use workspaces sparingly.** While Terraform workspaces can provide state isolation, they add complexity in a mono-repo context. Separate directories are generally clearer.

## Best Practices

1. **One state file per component per environment.** Never share state across environments.
2. **Use partial backend configuration** to reduce duplication.
3. **Define and enforce dependency ordering** between components.
4. **Only run CI/CD on changed components** to keep pipelines fast.
5. **Create helper modules** for cross-component state references.
6. **Use a consistent naming convention** for state keys that mirrors the directory structure.
7. **Document the component dependency graph** so new team members understand the apply order.

A well-structured mono-repo with proper state isolation gives you the benefits of keeping code together without the risks of monolithic state files. The key is treating each component directory as an independent Terraform project that happens to share modules and conventions with its neighbors.
