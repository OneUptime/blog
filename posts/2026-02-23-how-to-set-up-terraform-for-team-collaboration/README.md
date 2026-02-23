# How to Set Up Terraform for Team Collaboration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Team Collaboration, Remote State, Infrastructure as Code, DevOps

Description: Learn how to set up Terraform for team collaboration with remote state backends, state locking, workspaces, code review workflows, and access control for safe multi-user infrastructure management.

---

Terraform works great for individual users, but as soon as a team starts using it, new challenges emerge. Multiple people editing the same infrastructure can cause conflicts. Without shared state, team members cannot see what others have deployed. Without locking, concurrent applies can corrupt your infrastructure. Setting up Terraform for team collaboration requires addressing these challenges with remote state, locking, code review workflows, and proper access controls.

In this guide, we will cover everything you need to set up Terraform for effective team collaboration, from state management to code review processes.

## Why Team Collaboration Needs Special Setup

When working alone, Terraform stores state locally in a `terraform.tfstate` file. This works fine for one person, but breaks down with a team:

- **State conflicts** - Two people running `terraform apply` simultaneously can overwrite each other's changes
- **State visibility** - Team members cannot see the current state of infrastructure without the state file
- **State consistency** - Local state files can get out of sync with reality
- **Secret exposure** - State files contain sensitive data and should not be in version control

## Setting Up Remote State

Remote state stores your Terraform state in a shared, centralized location that all team members can access.

### AWS S3 Backend with DynamoDB Locking

The most common setup for AWS users:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

Create the S3 bucket and DynamoDB table before using this backend:

```hcl
# state-infrastructure/main.tf
# This is a separate Terraform project for bootstrapping state storage

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for state storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning to recover from bad state
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### Azure Storage Backend

For Azure users:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "mycompanytfstate"
    container_name       = "tfstate"
    key                  = "production/terraform.tfstate"
  }
}
```

### Google Cloud Storage Backend

For GCP users:

```hcl
terraform {
  backend "gcs" {
    bucket = "my-company-terraform-state"
    prefix = "production/infrastructure"
  }
}
```

### Terraform Cloud Backend

Terraform Cloud provides state management plus additional collaboration features:

```hcl
terraform {
  cloud {
    organization = "my-company"

    workspaces {
      name = "production-infrastructure"
    }
  }
}
```

## State Locking

State locking prevents two people from modifying the same state simultaneously. Most remote backends support locking natively:

- **S3 + DynamoDB** - DynamoDB provides locking
- **Azure Storage** - Blob leases provide locking
- **GCS** - Built-in locking
- **Terraform Cloud** - Built-in locking

When someone runs `terraform apply`, Terraform acquires a lock. If another person tries to apply at the same time, they see:

```
Error: Error acquiring the state lock

Lock Info:
  ID:        12345678-abcd-efgh-ijkl-1234567890ab
  Path:      s3://my-company-terraform-state/production/terraform.tfstate
  Operation: OperationTypeApply
  Who:       alice@workstation
  Version:   1.6.0
  Created:   2026-02-23 10:30:00.000000 UTC
```

If a lock gets stuck (for example, due to a crashed process), an admin can force-unlock it:

```bash
# Only use this if you are sure no one is currently applying
terraform force-unlock 12345678-abcd-efgh-ijkl-1234567890ab
```

## Workspace Strategy

Workspaces let you manage multiple environments (dev, staging, production) with the same configuration:

### Separate Directories (Recommended)

The simplest and most explicit approach:

```
infrastructure/
  modules/
    server/
      main.tf
      variables.tf
      outputs.tf
  environments/
    development/
      main.tf          # Uses ../modules/server
      backend.tf       # Points to dev state
      terraform.tfvars # Dev-specific values
    staging/
      main.tf
      backend.tf
      terraform.tfvars
    production/
      main.tf
      backend.tf
      terraform.tfvars
```

### Terraform Workspaces

For environments that are nearly identical:

```hcl
# main.tf
locals {
  environment = terraform.workspace

  # Environment-specific configuration
  config = {
    development = {
      instance_type = "t3.small"
      instance_count = 1
      enable_monitoring = false
    }
    staging = {
      instance_type = "t3.medium"
      instance_count = 2
      enable_monitoring = true
    }
    production = {
      instance_type = "t3.large"
      instance_count = 3
      enable_monitoring = true
    }
  }
}

resource "aws_instance" "web" {
  count         = local.config[local.environment].instance_count
  instance_type = local.config[local.environment].instance_type
  # ...
}
```

```bash
# Create and switch workspaces
terraform workspace new development
terraform workspace new staging
terraform workspace new production

# Switch between workspaces
terraform workspace select production

# Apply to the current workspace
terraform apply
```

## Code Review Workflow

Infrastructure changes should go through code review just like application code:

### Branch Protection

Configure branch protection rules in GitHub:

```yaml
# Branch protection for main branch:
# - Require pull request reviews (at least 1 reviewer)
# - Require status checks to pass (terraform plan)
# - Do not allow force pushes
# - Require branches to be up to date before merging
```

### Plan on Pull Request

Run `terraform plan` automatically on pull requests so reviewers can see the proposed changes:

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    branches: [main]
    paths:
      - 'infrastructure/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6"

      - name: Terraform Init
        working-directory: infrastructure/environments/production
        run: terraform init

      - name: Terraform Plan
        id: plan
        working-directory: infrastructure/environments/production
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true

      - name: Comment plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`
            *Pushed by: @${{ github.actor }}*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      - name: Plan Status
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

### Apply After Merge

Apply changes automatically after merging to main:

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    environment: production  # Requires approval in GitHub settings
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: infrastructure/environments/production
        run: terraform init

      - name: Terraform Apply
        working-directory: infrastructure/environments/production
        run: terraform apply -auto-approve
```

## Variable Management

Manage variables securely across the team:

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "The environment name"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database admin password"
}
```

```hcl
# terraform.tfvars (committed to version control - non-sensitive values only)
environment = "production"
region      = "us-east-1"
```

For sensitive values, use environment variables or a secrets manager:

```bash
# Set sensitive values via environment variables
export TF_VAR_db_password="super-secret-password"

# Or use a .tfvars file that is gitignored
# secrets.tfvars (in .gitignore)
terraform apply -var-file=secrets.tfvars
```

## Module Registry

Share reusable modules across the team using a private module registry:

```hcl
# Use modules from a private registry
module "server" {
  source  = "app.terraform.io/my-company/server/aws"
  version = "~> 1.0"

  name   = "web-server"
  region = "us-east-1"
}
```

Or use Git-based modules:

```hcl
module "server" {
  source = "git::https://github.com/my-company/terraform-modules.git//server?ref=v1.0.0"

  name   = "web-server"
  region = "us-east-1"
}
```

## Best Practices

**Use remote state from day one.** Do not start with local state and migrate later. Set up remote state before your first resource.

**Enable state locking.** Never use a backend without locking when working in a team.

**Encrypt state at rest.** State files contain sensitive data. Always enable encryption on your state backend.

**Use separate state files per environment.** Do not share a single state file across development, staging, and production.

**Review plans before applying.** Require code review and plan output review before any infrastructure changes reach production.

**Use modules for reusable components.** Shared modules reduce duplication and ensure consistency across environments.

**Pin provider and Terraform versions.** Use version constraints to prevent unexpected behavior from version upgrades.

**Document your workflow.** Write down the steps for common operations so the whole team follows the same process.

## Conclusion

Setting up Terraform for team collaboration requires thoughtful decisions about state management, locking, code review workflows, and access control. By using remote state with locking, implementing plan-on-PR workflows, and following consistent practices, you can enable your team to manage infrastructure safely and efficiently.

For more on Terraform provider development, see our guides on [versioning custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-version-custom-terraform-providers/view) and [using the Terraform Provider Framework](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-provider-framework-for-new-providers/view).
