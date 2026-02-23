# How to Use State Environments vs Workspaces in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Workspaces, Environments, DevOps

Description: Understand the differences between Terraform workspaces and environment-based state separation, and when to use each approach for managing multiple environments.

---

Managing multiple environments (dev, staging, production) is one of the first challenges teams face when adopting Terraform. There are two main approaches: Terraform workspaces and separate directory/backend configurations. Each has genuine strengths and weaknesses, and picking the wrong one early can create headaches later.

This guide breaks down both approaches with concrete examples so you can make an informed choice.

## Terraform Workspaces

Terraform workspaces let you maintain multiple state files within a single configuration directory. Each workspace has its own state, but they all share the same `.tf` files.

### Creating and Using Workspaces

```bash
# List existing workspaces (default always exists)
terraform workspace list
# * default

# Create a new workspace
terraform workspace new dev
# Created and switched to workspace "dev"

terraform workspace new staging
terraform workspace new production

# Switch between workspaces
terraform workspace select dev

# Show current workspace
terraform workspace show
# dev
```

### How Workspaces Affect State

Each workspace gets its own state file. With an S3 backend, the state paths look like this:

```
s3://my-terraform-state/env:/dev/terraform.tfstate
s3://my-terraform-state/env:/staging/terraform.tfstate
s3://my-terraform-state/env:/production/terraform.tfstate
```

The `default` workspace uses the root key:
```
s3://my-terraform-state/terraform.tfstate
```

### Using Workspace Name in Configuration

The current workspace name is available via `terraform.workspace`, which you can use to parameterize your configuration:

```hcl
# variables.tf
variable "instance_types" {
  type = map(string)
  default = {
    dev        = "t3.micro"
    staging    = "t3.small"
    production = "t3.large"
  }
}

variable "instance_counts" {
  type = map(number)
  default = {
    dev        = 1
    staging    = 2
    production = 3
  }
}
```

```hcl
# main.tf - Use workspace name to select environment-specific values
resource "aws_instance" "app" {
  count         = var.instance_counts[terraform.workspace]
  ami           = "ami-0123456789abcdef0"
  instance_type = var.instance_types[terraform.workspace]

  tags = {
    Name        = "app-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

# Use workspace name in resource naming to avoid conflicts
resource "aws_s3_bucket" "data" {
  bucket = "my-app-data-${terraform.workspace}"
}
```

### Backend Configuration with Workspaces

```hcl
# backend.tf - Single backend config, workspaces handle separation
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

## Environment Directories (Separate Configurations)

The alternative approach uses completely separate directories for each environment, each with its own backend configuration:

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
    production/
      main.tf
      backend.tf
      terraform.tfvars
```

### Environment Directory Structure

```hcl
# terraform/environments/dev/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "dev/app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# terraform/environments/dev/main.tf
module "app" {
  source = "../../modules/app"

  environment    = "dev"
  instance_type  = "t3.micro"
  instance_count = 1
}
```

```hcl
# terraform/environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# terraform/environments/production/main.tf
module "app" {
  source = "../../modules/app"

  environment    = "production"
  instance_type  = "t3.large"
  instance_count = 3

  # Production-only resources
  enable_monitoring = true
  enable_backups    = true
}
```

```hcl
# terraform/modules/app/variables.tf
variable "environment" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "enable_monitoring" {
  type    = bool
  default = false
}

variable "enable_backups" {
  type    = bool
  default = false
}
```

## Comparing the Two Approaches

### Workspace Pros

- Less code duplication - one set of `.tf` files for all environments.
- Easy to create new environments - just `terraform workspace new`.
- Simple workflow for environments that are truly identical except for size.

### Workspace Cons

- All environments share the same configuration, making it hard to have production-only resources.
- Switching workspaces is error-prone. One wrong `terraform workspace select` and you're applying dev changes to production.
- The workspace name is just a string - there's no structural enforcement of differences between environments.
- Hard to review what's different between environments because it's all conditional logic.

### Environment Directory Pros

- Each environment is explicit and self-contained. You can see exactly what production looks like by reading its directory.
- No risk of accidentally applying to the wrong environment.
- Easy to have different resources per environment (monitoring in prod, debug tools in dev).
- Each environment can use different Terraform versions, provider versions, or module versions.
- Better for code review - changes to production are clearly visible in PRs.

### Environment Directory Cons

- More code to maintain. Changes to shared logic need to be updated in every environment.
- Using modules mitigates this, but you still have per-environment glue code.
- More directories and files to manage.

## The Hybrid Approach

Many teams use a combination. Workspaces work well for ephemeral environments (feature branches, testing), while directory separation works better for permanent environments:

```
terraform/
  modules/
    app/
  environments/
    dev/         # Permanent - directory approach
    staging/     # Permanent - directory approach
    production/  # Permanent - directory approach
    preview/     # Uses workspaces for feature branches
```

```hcl
# terraform/environments/preview/main.tf
# Each feature branch gets its own workspace
module "app" {
  source = "../../modules/app"

  environment    = "preview-${terraform.workspace}"
  instance_type  = "t3.micro"
  instance_count = 1
}
```

```bash
# Create a preview environment for a feature branch
cd terraform/environments/preview
terraform workspace new feature-login-redesign
terraform apply

# Clean up after merge
terraform destroy
terraform workspace select default
terraform workspace delete feature-login-redesign
```

## Terragrunt as an Alternative

Terragrunt provides another way to manage multiple environments that avoids some drawbacks of both approaches:

```hcl
# terragrunt.hcl in each environment directory
terraform {
  source = "../../modules/app"
}

inputs = {
  environment    = "production"
  instance_type  = "t3.large"
  instance_count = 3
}

# Automatically generates backend configuration
remote_state {
  backend = "s3"
  config = {
    bucket         = "my-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

## Migration Between Approaches

If you need to switch from workspaces to directories (a common evolution):

```bash
# Step 1: Pull each workspace's state
terraform workspace select dev
terraform state pull > /tmp/dev.tfstate

terraform workspace select production
terraform state pull > /tmp/production.tfstate

# Step 2: Create new directory structure
mkdir -p terraform/environments/{dev,production}

# Step 3: Initialize new backends and push states
cd terraform/environments/dev
terraform init
terraform state push /tmp/dev.tfstate

cd terraform/environments/production
terraform init
terraform state push /tmp/production.tfstate
```

## Which Should You Choose?

Use **workspaces** when:
- Environments are nearly identical (same resources, different sizes).
- You need to create and destroy environments frequently.
- Your team is small and everyone knows the workspace workflow.
- You're building ephemeral environments for testing.

Use **separate directories** when:
- Environments have meaningful structural differences.
- You need strict separation of concerns (different teams, different permissions).
- You want explicit, reviewable configuration for each environment.
- You need different provider or module versions per environment.
- You're working in a regulated environment where audit trails matter.

For most teams at scale, separate directories with shared modules ends up being the better choice. The extra code is worth the clarity and safety.

## Wrapping Up

There's no universally right answer here. Workspaces offer simplicity and less duplication. Separate directories offer clarity and safety. Many successful teams use both, with directories for permanent environments and workspaces for ephemeral ones.

The most important thing is to pick an approach early and be consistent. Mixing approaches randomly within a project leads to confusion and mistakes.

For more on Terraform state organization, check out our posts on [configuring state access controls](https://oneuptime.com/blog/post/2026-02-23-configure-state-access-controls-terraform/view) and [splitting state files into multiple states](https://oneuptime.com/blog/post/2026-02-23-split-terraform-state-file-multiple-states/view).
