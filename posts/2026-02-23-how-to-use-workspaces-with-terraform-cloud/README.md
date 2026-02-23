# How to Use Workspaces with Terraform Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Cloud, Workspaces, Remote Operations, Team Collaboration

Description: Learn how Terraform Cloud workspaces differ from CLI workspaces, how to configure them, manage variables per workspace, and integrate with VCS-driven workflows for team collaboration.

---

Terraform Cloud workspaces and CLI workspaces share a name but work very differently. CLI workspaces are just multiple state files for the same configuration. Terraform Cloud workspaces are full-featured environments with their own variables, state, run history, access controls, and VCS connections. Understanding these differences and how to use Terraform Cloud workspaces effectively is essential if your team is moving to Terraform Cloud. This post covers the setup, configuration, and practical patterns.

## CLI Workspaces vs Terraform Cloud Workspaces

Let us clear up the confusion right away:

| Feature | CLI Workspaces | Terraform Cloud Workspaces |
|---|---|---|
| Configuration | Shared (same .tf files) | Can be independent |
| Variables | Manual -var-file | Built-in per workspace |
| State | Same backend, different keys | Isolated per workspace |
| Runs | Local machine | Remote or local |
| Access control | None (backend-level) | Fine-grained RBAC |
| Run history | None | Full audit trail |
| Notifications | None | Slack, email, webhooks |

When you use Terraform Cloud, its workspaces replace CLI workspaces entirely. You do not use `terraform workspace select` - instead, each Cloud workspace is a separate entity.

## Setting Up the Cloud Backend

Configure your Terraform project to use Terraform Cloud:

```hcl
# main.tf

terraform {
  cloud {
    organization = "my-organization"

    workspaces {
      name = "app-production"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

Initialize and log in:

```bash
# Log in to Terraform Cloud
terraform login

# Initialize - connects to the Cloud workspace
terraform init
```

## Workspace Naming Strategies

### Single Workspace per Configuration

```hcl
terraform {
  cloud {
    organization = "acme"

    workspaces {
      name = "networking-prod"
    }
  }
}
```

### Tag-Based Workspace Selection

Use tags to group related workspaces:

```hcl
terraform {
  cloud {
    organization = "acme"

    workspaces {
      tags = ["app:api", "component:compute"]
    }
  }
}
```

When you run `terraform init`, Terraform Cloud prompts you to select from workspaces matching those tags.

### Project-Based Organization

Terraform Cloud Projects group workspaces:

```
Organization: acme
  Project: platform
    Workspace: platform-networking-dev
    Workspace: platform-networking-staging
    Workspace: platform-networking-prod
  Project: application
    Workspace: app-api-dev
    Workspace: app-api-staging
    Workspace: app-api-prod
    Workspace: app-frontend-dev
    Workspace: app-frontend-prod
```

## Managing Variables per Workspace

One of Terraform Cloud's biggest advantages over CLI workspaces is built-in variable management.

### Through the UI

Navigate to your workspace, click "Variables," and add them. You can mark variables as sensitive to hide their values.

### Through the API

```bash
# Create a variable in a workspace
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "instance_type",
        "value": "t3.large",
        "category": "terraform",
        "hcl": false,
        "sensitive": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars"
```

### Through Terraform Itself

Use the `tfe` provider to manage Terraform Cloud workspaces and variables as code:

```hcl
# tfc-management/main.tf
# This configuration manages Terraform Cloud itself

provider "tfe" {
  organization = "acme"
}

# Create workspaces for each environment
resource "tfe_workspace" "api" {
  for_each = toset(["dev", "staging", "prod"])

  name         = "app-api-${each.key}"
  organization = "acme"
  project_id   = tfe_project.application.id

  # Connect to VCS
  vcs_repo {
    identifier     = "acme/infrastructure"
    branch         = each.key == "prod" ? "main" : each.key
    oauth_token_id = var.oauth_token_id
  }

  # Working directory within the repo
  working_directory = "terraform/api"

  # Auto-apply for dev, manual for staging and prod
  auto_apply = each.key == "dev"

  tag_names = ["app:api", "env:${each.key}"]
}

# Set variables per workspace
resource "tfe_variable" "instance_type" {
  for_each = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }

  key          = "instance_type"
  value        = each.value
  category     = "terraform"
  workspace_id = tfe_workspace.api[each.key].id
}

resource "tfe_variable" "aws_region" {
  for_each = tfe_workspace.api

  key          = "aws_region"
  value        = "us-east-1"
  category     = "terraform"
  workspace_id = each.value.id
}

# Set environment variables (like AWS credentials)
resource "tfe_variable" "aws_access_key" {
  for_each = tfe_workspace.api

  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key
  category     = "env"
  sensitive    = true
  workspace_id = each.value.id
}
```

## VCS-Driven Workflows

Connect workspaces to your version control system for automatic plans and applies:

```hcl
resource "tfe_workspace" "production" {
  name         = "app-prod"
  organization = "acme"

  vcs_repo {
    identifier     = "acme/infrastructure"
    branch         = "main"
    oauth_token_id = var.github_oauth_token_id
  }

  # Only trigger on changes to specific paths
  working_directory   = "terraform/app"
  trigger_prefixes    = ["terraform/modules/"]

  # Require manual approval for production
  auto_apply = false

  # Terraform version
  terraform_version = "1.7.0"
}
```

With this setup:

1. A developer pushes to a feature branch
2. Terraform Cloud creates a speculative plan (no apply)
3. The plan shows as a check on the PR
4. When merged to main, Terraform Cloud plans again
5. A team member manually approves the apply in the UI

## Run Triggers

Chain workspaces so that one workspace's apply triggers a run in another:

```hcl
# When networking workspace changes, trigger compute workspace
resource "tfe_run_trigger" "networking_to_compute" {
  workspace_id  = tfe_workspace.compute_prod.id
  sourceable_id = tfe_workspace.networking_prod.id
}
```

This is useful when infrastructure has dependencies:

```
networking-prod (apply) --> triggers --> compute-prod (plan + apply)
                       --> triggers --> database-prod (plan + apply)
```

## Access Controls

Terraform Cloud has team-based access control:

```hcl
# Create teams
resource "tfe_team" "developers" {
  name         = "developers"
  organization = "acme"
}

resource "tfe_team" "platform" {
  name         = "platform-team"
  organization = "acme"
}

# Developers can plan but not apply to production
resource "tfe_team_access" "dev_prod_read" {
  access       = "plan"
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.api["prod"].id
}

# Developers have full access to dev
resource "tfe_team_access" "dev_dev_write" {
  access       = "write"
  team_id      = tfe_team.developers.id
  workspace_id = tfe_workspace.api["dev"].id
}

# Platform team has admin on everything
resource "tfe_team_access" "platform_admin" {
  for_each = tfe_workspace.api

  access       = "admin"
  team_id      = tfe_team.platform.id
  workspace_id = each.value.id
}
```

## Using CLI with Cloud Workspaces

You can still run Terraform locally while using Cloud workspaces:

```hcl
terraform {
  cloud {
    organization = "acme"

    workspaces {
      name = "app-dev"
    }
  }
}
```

```bash
# Plans run remotely on Terraform Cloud
terraform plan

# Output streams back to your terminal
# State is stored in Terraform Cloud

# For local execution mode:
# Set execution mode to "local" in workspace settings
# Plans run locally but state stays in Terraform Cloud
```

### Execution Modes

- **Remote** (default): Plans and applies run on Terraform Cloud infrastructure
- **Local**: Plans and applies run on your machine, state stored in Terraform Cloud
- **Agent**: Plans and applies run on your own Terraform Cloud Agent infrastructure

## Variable Sets

Share variables across multiple workspaces:

```hcl
# Variable set for AWS credentials - shared across all workspaces
resource "tfe_variable_set" "aws_credentials" {
  name         = "AWS Credentials"
  organization = "acme"
}

resource "tfe_variable" "aws_access_key_shared" {
  key             = "AWS_ACCESS_KEY_ID"
  value           = var.aws_access_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_credentials.id
}

resource "tfe_variable" "aws_secret_key_shared" {
  key             = "AWS_SECRET_ACCESS_KEY"
  value           = var.aws_secret_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_credentials.id
}

# Apply the variable set to all API workspaces
resource "tfe_workspace_variable_set" "aws_to_api" {
  for_each = tfe_workspace.api

  variable_set_id = tfe_variable_set.aws_credentials.id
  workspace_id    = each.value.id
}
```

## Migrating CLI Workspaces to Terraform Cloud

If you are currently using CLI workspaces and want to move to Terraform Cloud:

```bash
#!/bin/bash
# migrate-to-tfc.sh

# For each CLI workspace, create a TFC workspace and push state
for ENV in dev staging prod; do
  echo "Migrating $ENV..."

  # Pull state from CLI workspace
  terraform workspace select "$ENV"
  terraform state pull > "/tmp/state-${ENV}.json"

  # Create TFC workspace (via API or tfe provider)
  # Then push state
  # The exact steps depend on your TFC setup
done
```

The cleaner approach is to update your backend configuration to `cloud` and run `terraform init`, which handles the migration interactively:

```hcl
# Change from this:
terraform {
  backend "s3" {
    bucket = "my-state"
    key    = "app/terraform.tfstate"
  }
}

# To this:
terraform {
  cloud {
    organization = "acme"
    workspaces {
      name = "app-prod"
    }
  }
}
```

```bash
terraform init
# Terraform detects the backend change and offers to migrate state
```

## Best Practices

**Use projects to organize workspaces.** Group related workspaces into projects for easier navigation and access control.

**Set auto-apply only for non-production.** Dev can auto-apply. Staging and production should require manual confirmation.

**Use variable sets for shared configuration.** Provider credentials, organization-wide settings, and common tags belong in variable sets.

**Connect to VCS for audit trails.** VCS-driven workflows give you a clear link between code changes and infrastructure changes.

**Use Sentinel or OPA policies.** Terraform Cloud supports policy-as-code to enforce organizational standards across all workspaces.

## Conclusion

Terraform Cloud workspaces provide everything CLI workspaces lack: built-in variable management, access controls, run history, and VCS integration. If you are outgrowing CLI workspaces, Terraform Cloud workspaces are the natural upgrade path. Start by creating workspaces per environment, configure variables through the TFE provider, and set up VCS-driven workflows for automated plans and applies. For handling resource naming across your workspaces, check out our post on [workspace-specific resource names](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-specific-resource-names-in-terraform/view).
