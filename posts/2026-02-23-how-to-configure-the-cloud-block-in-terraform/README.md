# How to Configure the cloud Block in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Cloud Block, Configuration, DevOps

Description: Deep dive into every configuration option available in the Terraform cloud block including workspaces, hostname, and project settings.

---

The `cloud` block in Terraform controls how your local configuration connects to HCP Terraform. While the basic setup is simple, there are several configuration options that most people never explore. This post covers every option available in the cloud block, when to use each one, and patterns that work well in practice.

## The Minimal Configuration

At its simplest, the cloud block needs just an organization and workspace:

```hcl
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      name = "api-server-prod"
    }
  }
}
```

That is all you need for a single workspace. Run `terraform init` and you are connected. But real-world setups usually need more flexibility.

## All Configuration Options

Here is the cloud block with every available option:

```hcl
terraform {
  cloud {
    # Required: your HCP Terraform organization name
    organization = "acme-corp"

    # Optional: defaults to app.terraform.io
    # Set this for Terraform Enterprise installations
    hostname = "app.terraform.io"

    # Optional: the project within the organization
    # Helps organize workspaces into logical groups
    project = "infrastructure"

    # Required: workspace selection (name OR tags, not both)
    workspaces {
      # Option 1: target a specific workspace
      name = "api-server-prod"

      # Option 2: target workspaces by tags (cannot use with name)
      # tags = ["service:api-server", "env:prod"]

      # Option 3: use a project to scope workspace selection
      # project = "platform-team"
    }
  }
}
```

Let's break down each option in detail.

## Organization Setting

The `organization` field is required and tells Terraform which HCP Terraform organization to use. If you work across multiple organizations, you can use an environment variable instead of hardcoding it:

```bash
# Set organization via environment variable
export TF_CLOUD_ORGANIZATION="acme-corp"
```

```hcl
# Then omit organization from the cloud block
terraform {
  cloud {
    # organization is read from TF_CLOUD_ORGANIZATION

    workspaces {
      name = "api-server-prod"
    }
  }
}
```

This is handy when the same Terraform code is used across different organizations, like when a consulting firm manages infrastructure for multiple clients.

## Hostname for Terraform Enterprise

If you run Terraform Enterprise instead of the hosted HCP Terraform, set the hostname to your installation:

```hcl
terraform {
  cloud {
    organization = "acme-corp"

    # Point to your self-hosted Terraform Enterprise
    hostname = "terraform.internal.acme.com"

    workspaces {
      name = "api-server-prod"
    }
  }
}
```

The default hostname is `app.terraform.io`. Only change this if you are running Terraform Enterprise on your own infrastructure.

## Workspace Selection by Name

Selecting a workspace by name creates a one-to-one mapping between your Terraform configuration and a single HCP Terraform workspace:

```hcl
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      # Exact workspace name - must already exist or will be created
      name = "api-server-prod"
    }
  }
}
```

This is the simplest approach and works well when each Terraform root module maps to exactly one workspace. Use this for:

- Single-environment configurations
- Shared infrastructure (networking, DNS)
- Configurations that do not need environment variance

## Workspace Selection by Tags

Tags let one configuration map to multiple workspaces, which is perfect for multi-environment setups:

```hcl
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      # Match workspaces with ALL of these tags
      tags = ["service:api-server"]
    }
  }
}
```

With tags, you use `terraform workspace` commands to switch between matching workspaces:

```bash
# Initialize - Terraform shows matching workspaces
terraform init

# List available workspaces
terraform workspace list
# * api-server-staging
#   api-server-production

# Switch to production
terraform workspace select api-server-production

# Create a new workspace with the matching tags
terraform workspace new api-server-dev
```

The key thing to understand: tags use AND logic. If you specify `tags = ["app:api", "region:us-east"]`, only workspaces with both tags match.

## Project Configuration

Projects in HCP Terraform are organizational containers for workspaces. You can specify a project at the cloud block level:

```hcl
terraform {
  cloud {
    organization = "acme-corp"

    # Associate with a specific project
    project = "platform-team"

    workspaces {
      name = "api-server-prod"
    }
  }
}
```

Projects help when your organization has many workspaces and you need a hierarchy. Think of projects as folders for workspaces.

You can also set the project via environment variable:

```bash
# Set project via environment variable
export TF_CLOUD_PROJECT="platform-team"
```

## Combining with Required Providers

The cloud block sits alongside your provider requirements in the `terraform` block:

```hcl
terraform {
  # Cloud block for HCP Terraform connection
  cloud {
    organization = "acme-corp"

    workspaces {
      name = "multi-cloud-prod"
    }
  }

  # Provider requirements
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Minimum Terraform version
  required_version = ">= 1.5.0"
}
```

## Environment Variable Overrides

Several cloud block settings can be overridden with environment variables. This is useful for CI/CD pipelines where you want the same code to target different environments:

```bash
# Override organization
export TF_CLOUD_ORGANIZATION="acme-corp"

# Override hostname (for switching between HCP Terraform and Enterprise)
export TF_CLOUD_HOSTNAME="terraform.internal.acme.com"

# Override workspace name
export TF_WORKSPACE="api-server-staging"

# Authentication token
export TF_TOKEN_app_terraform_io="your-api-token"
```

```hcl
# Minimal cloud block when using environment variables
terraform {
  cloud {
    # All settings come from environment variables
    workspaces {}
  }
}
```

## Patterns for Multi-Environment Deployments

Here are two common patterns for handling multiple environments.

### Pattern 1: Tags with Workspace-Specific Variables

```hcl
# Same code deploys to staging and production
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      tags = ["service:api"]
    }
  }
}

# Variables are set differently per workspace in HCP Terraform
variable "environment" {
  type = string
}

variable "instance_count" {
  type = number
}

resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.environment == "production" ? "t3.large" : "t3.micro"

  tags = {
    Name        = "api-${var.environment}-${count.index}"
    Environment = var.environment
  }
}
```

### Pattern 2: Separate Root Modules per Environment

```hcl
# environments/production/main.tf
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      name = "api-server-production"
    }
  }
}

module "api" {
  source         = "../../modules/api-server"
  environment    = "production"
  instance_count = 4
  instance_type  = "t3.large"
}
```

```hcl
# environments/staging/main.tf
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      name = "api-server-staging"
    }
  }
}

module "api" {
  source         = "../../modules/api-server"
  environment    = "staging"
  instance_count = 1
  instance_type  = "t3.micro"
}
```

## What You Cannot Put in the Cloud Block

A few things are not configurable in the cloud block:

- You cannot set execution mode (remote vs local) - that is a workspace setting
- You cannot configure VCS connections - those are managed in the UI or API
- You cannot set variables - use the workspace UI or API
- You cannot specify run triggers - configure those at the workspace level

The cloud block is purely about connecting your CLI to the right organization and workspace. Everything else is configured through HCP Terraform itself.

## Validation and Troubleshooting

After configuring your cloud block, validate it:

```bash
# Initialize and validate
terraform init

# If you see "Initializing HCP Terraform...", the connection works
# If you get errors, check:
# 1. Organization name is correct
# 2. Workspace exists (or you have permission to create it)
# 3. Your API token is valid (terraform login)
# 4. Hostname is reachable (for Terraform Enterprise)
```

The cloud block is the foundation of your HCP Terraform integration. Getting it right means smoother operations, better team collaboration, and reliable state management for your infrastructure.
