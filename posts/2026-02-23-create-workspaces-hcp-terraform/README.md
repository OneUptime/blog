# How to Create Workspaces in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Workspace, DevOps, Infrastructure as Code

Description: Learn how to create and configure workspaces in HCP Terraform using the UI, CLI, API, and Terraform provider, with guidance on workspace strategy and settings.

---

Workspaces in HCP Terraform are the fundamental unit of organization. Each workspace has its own Terraform state, variables, access controls, and run history. Think of them as isolated environments for managing a specific set of infrastructure. Getting your workspace strategy right is essential because it determines how your team collaborates, how changes are isolated, and how fast your plans run.

This guide covers creating workspaces through every available method and configuring them for real-world use.

## Creating a Workspace via the UI

The simplest way to get started:

1. Navigate to your organization in HCP Terraform
2. Click "New" then "Workspace"
3. Choose a workflow type:
   - **Version control workflow** - Links to a VCS repository
   - **CLI-driven workflow** - Triggered from the Terraform CLI
   - **API-driven workflow** - Triggered by external systems

4. Configure the workspace:

```text
Workspace Name: production-networking
Description: Production VPC, subnets, and routing configuration
Project: Production Infrastructure
```

5. If you chose VCS workflow, select the repository and configure:
```text
VCS repository: myorg/infrastructure
Branch: main
Terraform Working Directory: environments/production/networking
```

6. Click "Create workspace"

## Creating a Workspace via the CLI

You can create workspaces from the terminal without visiting the UI. First, configure the cloud block:

```hcl
# main.tf
terraform {
  cloud {
    organization = "acme-infrastructure"

    workspaces {
      name = "staging-networking"
    }
  }
}
```

Then initialize:

```bash
terraform init

# If the workspace does not exist, Terraform prompts you:
# Workspace "staging-networking" doesn't exist.
#
# No workspaces are tagged with "staging-networking" in the "acme-infrastructure"
# organization.
#
# Would you like to create it? (y/n)
```

Type `y` and the workspace is created automatically.

## Creating Workspaces via the API

For automation and CI/CD pipelines:

```bash
# Create a workspace via the API
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "production-compute",
        "description": "Production EC2 and ECS resources",
        "auto-apply": false,
        "terraform-version": "1.7.0",
        "working-directory": "environments/production/compute",
        "execution-mode": "remote"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/workspaces"
```

## Creating Workspaces with Terraform

The most reproducible approach - manage workspaces as code using the `tfe` provider:

```hcl
provider "tfe" {
  # Uses TFE_TOKEN environment variable
}

# Define workspaces in a map for easy management
variable "workspaces" {
  type = map(object({
    description       = string
    project           = string
    terraform_version = optional(string, "1.7.0")
    auto_apply        = optional(bool, false)
    working_directory = optional(string, "")
    vcs_repo          = optional(object({
      identifier     = string
      branch         = optional(string, "main")
      oauth_token_id = string
    }))
    tag_names = optional(list(string), [])
  }))
}

resource "tfe_workspace" "workspaces" {
  for_each = var.workspaces

  name              = each.key
  organization      = var.organization
  description       = each.value.description
  project_id        = tfe_project.projects[each.value.project].id
  terraform_version = each.value.terraform_version
  auto_apply        = each.value.auto_apply
  working_directory = each.value.working_directory
  tag_names         = each.value.tag_names

  # Conditionally attach VCS repo
  dynamic "vcs_repo" {
    for_each = each.value.vcs_repo != null ? [each.value.vcs_repo] : []
    content {
      identifier     = vcs_repo.value.identifier
      branch         = vcs_repo.value.branch
      oauth_token_id = vcs_repo.value.oauth_token_id
    }
  }
}
```

```hcl
# terraform.tfvars

workspaces = {
  "production-networking" = {
    description = "Production VPC and networking"
    project     = "production"
    auto_apply  = false
    tag_names   = ["production", "networking", "aws"]
    vcs_repo = {
      identifier     = "acme/infrastructure"
      branch         = "main"
      oauth_token_id = "ot-abc123"
    }
    working_directory = "environments/production/networking"
  }

  "staging-networking" = {
    description = "Staging VPC and networking"
    project     = "staging"
    auto_apply  = true
    tag_names   = ["staging", "networking", "aws"]
    vcs_repo = {
      identifier     = "acme/infrastructure"
      branch         = "main"
      oauth_token_id = "ot-abc123"
    }
    working_directory = "environments/staging/networking"
  }

  "dev-networking" = {
    description = "Dev VPC and networking"
    project     = "development"
    auto_apply  = true
    tag_names   = ["dev", "networking", "aws"]
  }
}
```

## Workspace Configuration Settings

Every workspace has settings that control its behavior. Here are the important ones:

### Execution Mode

```hcl
resource "tfe_workspace" "example" {
  # ...

  # Remote: Plans and applies run on HCP Terraform
  execution_mode = "remote"

  # Local: Plans and applies run on your machine,
  # but state is stored in HCP Terraform
  # execution_mode = "local"

  # Agent: Plans and applies run on your own agent
  # execution_mode = "agent"
  # agent_pool_id  = tfe_agent_pool.my_pool.id
}
```

### Auto Apply

```hcl
resource "tfe_workspace" "staging" {
  name       = "staging-app"
  auto_apply = true
  # Applies automatically after a successful plan
  # Good for dev/staging, risky for production
}

resource "tfe_workspace" "production" {
  name       = "production-app"
  auto_apply = false
  # Requires manual confirmation to apply
  # Always use this for production
}
```

### Terraform Version

```hcl
resource "tfe_workspace" "example" {
  name              = "my-workspace"
  terraform_version = "1.7.0"
  # Pin to a specific version to avoid surprises
  # You can also use "~> 1.7.0" for latest patch
}
```

### Working Directory

For monorepos where multiple workspaces share a repository:

```hcl
resource "tfe_workspace" "prod_networking" {
  name              = "production-networking"
  working_directory = "environments/production/networking"
  # Terraform only runs within this subdirectory
}

resource "tfe_workspace" "prod_compute" {
  name              = "production-compute"
  working_directory = "environments/production/compute"
}
```

### Trigger Patterns

Control which file changes trigger a run:

```hcl
resource "tfe_workspace" "example" {
  name = "my-workspace"

  # Only trigger when files in these paths change
  trigger_patterns = [
    "modules/networking/**/*",
    "environments/production/networking/**/*",
  ]

  # Or use prefix-based triggers
  # trigger_prefixes = ["/environments/production/networking"]
}
```

## Workspace Strategy

How you organize workspaces depends on your team structure and infrastructure. Here are common patterns:

### Per-Environment

```text
production-app
staging-app
dev-app
```

Same configuration, different variable values. Simple and works for small teams.

### Per-Component Per-Environment

```text
production-networking
production-compute
production-database
staging-networking
staging-compute
staging-database
```

Separates concerns so network changes do not require replanning compute resources.

### Per-Team

```text
platform-shared-services
team-alpha-app
team-beta-app
team-gamma-data-pipeline
```

Each team manages their own workspaces. Works well with RBAC.

### Using Tags for Organization

Tags help you filter and find workspaces:

```hcl
resource "tfe_workspace" "example" {
  name      = "production-networking"
  tag_names = ["production", "networking", "aws", "us-east-1"]
}
```

In the CLI, you can target workspaces by tag:

```hcl
terraform {
  cloud {
    organization = "acme-infrastructure"

    workspaces {
      tags = ["production", "networking"]
    }
  }
}
```

## Workspace Notifications

Set up notifications to know when runs succeed or fail:

```hcl
resource "tfe_notification_configuration" "slack" {
  name             = "slack-alerts"
  workspace_id     = tfe_workspace.production.id
  enabled          = true
  destination_type = "slack"
  url              = var.slack_webhook_url
  triggers         = ["run:completed", "run:errored"]
}
```

## Cleaning Up Workspaces

To delete a workspace, first destroy its managed resources:

```bash
# From CLI
terraform destroy

# Then delete the workspace in the UI or via API
```

Or with the provider:

```hcl
# Simply remove the workspace from your configuration
# and run terraform apply
```

Be careful - deleting a workspace does not destroy the infrastructure it manages. Always run `terraform destroy` first unless you intend to keep the resources.

## Wrapping Up

Workspaces are the building blocks of your HCP Terraform setup. Create them through whichever method fits your workflow - UI for one-off workspaces, CLI for quick setup, API for automation, or the `tfe` provider for managing workspaces as code. Choose a workspace strategy that matches your team structure and infrastructure layout, use tags for organization, and always pin your Terraform version. For next steps, look into [configuring VCS-driven workflows](https://oneuptime.com/blog/post/2026-02-23-vcs-driven-workflow-hcp-terraform/view) and [setting up variables](https://oneuptime.com/blog/post/2026-02-23-variables-hcp-terraform-workspaces/view).
