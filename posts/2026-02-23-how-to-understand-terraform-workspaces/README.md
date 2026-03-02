# How to Understand Terraform Workspaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Infrastructure as Code, State Management, DevOps

Description: A clear explanation of what Terraform workspaces are, how they work under the hood, when to use them, and when to pick a different approach for managing multiple environments.

---

Terraform workspaces are one of those features that sound simple on the surface but trip people up once they start using them in real projects. They are not what most people expect when they hear "workspace," and the confusion gets worse because Terraform Cloud uses the same word to mean something different. This post breaks down what workspaces actually are, how they work internally, and when they make sense for your infrastructure.

## What Workspaces Actually Are

At its core, a Terraform workspace is a named instance of state within a single configuration directory. When you run Terraform, it reads your `.tf` files and maintains a state file that tracks what infrastructure exists. Workspaces let you have multiple state files for the same set of configuration files.

Think of it this way. You have one set of Terraform code. Workspaces let you apply that code multiple times, each time tracking the results separately.

```
my-terraform-project/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfstate.d/
    dev/
      terraform.tfstate     # State for dev workspace
    staging/
      terraform.tfstate     # State for staging workspace
    prod/
      terraform.tfstate     # State for prod workspace
```

Every Terraform configuration starts with a workspace called `default`. You have been using it all along without realizing it.

## How Workspaces Work Under the Hood

When you create a new workspace, Terraform does not copy your configuration files or create a new directory of `.tf` files. It only creates a new, empty state file. All workspaces share the exact same Terraform code.

Here is the key mental model:

```
Configuration (shared)     State (per workspace)
+------------------+       +------------------+
| main.tf          |  ---> | default.tfstate  |
| variables.tf     |  ---> | dev.tfstate      |
| outputs.tf       |  ---> | staging.tfstate  |
+------------------+       | prod.tfstate     |
                           +------------------+
```

When you switch workspaces, Terraform points at a different state file. That is it. The code stays the same. The variables stay the same unless you add logic to differentiate.

### Local State Storage

With the default local backend, workspace state files live in a `terraform.tfstate.d` directory:

```bash
# Check the directory structure after creating workspaces
ls -la terraform.tfstate.d/
# drwxr-xr-x  dev/
# drwxr-xr-x  staging/
# drwxr-xr-x  prod/
```

The `default` workspace state lives at `terraform.tfstate` in the root directory. Other workspaces get subdirectories.

### Remote State Storage

With a remote backend like S3, workspaces typically get different key prefixes:

```hcl
# Backend configuration with S3
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

# Workspace "dev" stores state at:
#   s3://my-terraform-state/env:/dev/infrastructure/terraform.tfstate
#
# Workspace "prod" stores state at:
#   s3://my-terraform-state/env:/prod/infrastructure/terraform.tfstate
```

## The terraform.workspace Variable

Inside your Terraform code, you can reference the current workspace name using the built-in `terraform.workspace` variable:

```hcl
# Use the workspace name to differentiate resources
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"

  tags = {
    Name        = "web-${terraform.workspace}"
    Environment = terraform.workspace
  }
}

# Use workspace name in S3 bucket naming
resource "aws_s3_bucket" "data" {
  bucket = "myapp-data-${terraform.workspace}"
}
```

This is the primary mechanism for making the same code behave differently across workspaces. Without referencing `terraform.workspace`, every workspace would create identical resources - which would cause naming conflicts.

## When Workspaces Make Sense

Workspaces work well in specific scenarios:

**Identical infrastructure with minor variations.** If dev, staging, and prod are truly the same architecture with only size differences, workspaces keep things DRY. You write the code once and vary behavior through `terraform.workspace` checks and workspace-specific variable files.

**Testing infrastructure changes.** You can create a temporary workspace to test a change without touching any existing environment. When done, destroy the resources and delete the workspace.

**Feature branch infrastructure.** Spin up a complete environment for a feature branch, then tear it down when the branch merges.

```hcl
# Good use case: same structure, different sizes
locals {
  instance_sizes = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

resource "aws_instance" "app" {
  instance_type = local.instance_sizes[terraform.workspace]
  # ...
}
```

## When Workspaces Do Not Make Sense

Workspaces are not the right tool for every situation:

**Significantly different architectures.** If your prod environment has a multi-AZ database cluster, a WAF, and a CDN, but dev is a single instance with SQLite, workspaces will be painful. Your code will be littered with conditionals.

**Different teams managing different environments.** Workspaces share the same backend credentials and permissions. If your prod team should not be able to modify dev, workspaces do not give you that separation.

**Different cloud accounts or regions.** Provider configuration is shared across the configuration. While you can use `terraform.workspace` in provider blocks to some extent, it gets messy. Separate root modules are cleaner for this.

```hcl
# This gets ugly fast - a sign you should not use workspaces
resource "aws_rds_cluster" "db" {
  count = terraform.workspace == "prod" ? 1 : 0
  # ... lots of production-only config
}

resource "aws_db_instance" "db" {
  count = terraform.workspace != "prod" ? 1 : 0
  # ... simpler config for non-prod
}
```

If you find yourself writing lots of conditional expressions based on the workspace name, that is a strong signal that separate configurations (different directories) would be a better fit.

## Workspaces vs. Terraform Cloud Workspaces

This is an important distinction. When HashiCorp talks about "workspaces" in Terraform Cloud, they mean something fundamentally different.

**CLI Workspaces** (what this post covers):
- Multiple state files for one configuration
- Same code, different state
- Switched with `terraform workspace select`

**Terraform Cloud Workspaces**:
- Independent working directories
- Each can have its own code, variables, and state
- Managed through the Terraform Cloud UI or API
- Much closer to what people intuitively expect a "workspace" to be

If you use Terraform Cloud, its workspaces are essentially separate configurations that happen to be managed on the same platform. CLI workspaces are a lighter-weight state isolation mechanism.

## Quick Reference of Workspace Commands

```bash
# List all workspaces (current one is marked with *)
terraform workspace list

# Create a new workspace and switch to it
terraform workspace new dev

# Switch to an existing workspace
terraform workspace select staging

# Show the current workspace
terraform workspace show

# Delete a workspace (must switch away first)
terraform workspace select default
terraform workspace delete dev
```

## A Practical Example

Here is a complete small example that uses workspaces to deploy a web server at different sizes:

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Map workspace names to configurations
locals {
  config = {
    dev = {
      instance_type = "t3.micro"
      instance_count = 1
    }
    staging = {
      instance_type = "t3.small"
      instance_count = 2
    }
    prod = {
      instance_type = "t3.large"
      instance_count = 3
    }
  }

  # Fall back to dev settings if workspace name is not in the map
  current = lookup(local.config, terraform.workspace, local.config["dev"])
}

resource "aws_instance" "web" {
  count         = local.current.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.current.instance_type

  tags = {
    Name        = "web-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

output "instance_ids" {
  value = aws_instance.web[*].id
}
```

## Conclusion

Terraform workspaces are a state management feature, not a full environment management solution. They shine when you have genuinely similar infrastructure that differs only in scale or minor configuration. They fall short when environments diverge significantly or when you need strict access controls between environments. Understanding this distinction saves you from building something that works on paper but becomes a maintenance burden in practice. For the next step, check out our guide on [creating a new workspace](https://oneuptime.com/blog/post/2026-02-23-how-to-create-a-new-workspace-with-terraform-workspace-new/view) to start putting this into practice.
