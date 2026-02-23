# How to Create Azure DevOps Projects in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure DevOps, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to create and manage Azure DevOps projects, repositories, pipelines, and service connections using Terraform for consistent DevOps infrastructure.

---

Azure DevOps provides developer services for teams to plan work, collaborate on code development, and build and deploy applications. It includes Azure Repos (Git repositories), Azure Pipelines (CI/CD), Azure Boards (work tracking), Azure Test Plans, and Azure Artifacts (package management). Most teams set these up manually through the web portal, but as your organization grows, managing dozens of projects with consistent configurations becomes a real challenge.

Terraform solves this by letting you define your Azure DevOps projects, repositories, branch policies, service connections, and variable groups as code. When a new team needs a project, you add it to your Terraform configuration, and everything gets created with the right settings from day one.

## The Azure DevOps Terraform Provider

Unlike most Azure services that use the `azurerm` provider, Azure DevOps has its own dedicated provider: `azuredevops`. This provider manages resources within Azure DevOps organizations and is maintained by Microsoft.

## Prerequisites

- Terraform 1.3+
- An Azure DevOps organization
- A Personal Access Token (PAT) with appropriate permissions, or use service principal authentication
- Azure CLI authenticated (for service connections to Azure)

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azuredevops = {
      source  = "microsoft/azuredevops"
      version = "~> 0.11"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# Configure the Azure DevOps provider
provider "azuredevops" {
  org_service_url       = "https://dev.azure.com/my-organization"
  personal_access_token = var.azdo_pat # Store in environment variable or use managed identity
}

provider "azurerm" {
  features {}
}

variable "azdo_pat" {
  type        = string
  sensitive   = true
  description = "Azure DevOps Personal Access Token"
}
```

## Creating a Project

```hcl
# Create an Azure DevOps project
resource "azuredevops_project" "main" {
  name               = "platform-services"
  description        = "Platform team services and infrastructure"
  visibility         = "private"
  version_control    = "Git"
  work_item_template = "Agile"

  # Enable/disable specific features
  features = {
    "boards"       = "enabled"
    "repositories" = "enabled"
    "pipelines"    = "enabled"
    "testplans"    = "disabled"
    "artifacts"    = "enabled"
  }
}

# Create a second project for a different team
resource "azuredevops_project" "frontend" {
  name               = "frontend-apps"
  description        = "Frontend application development"
  visibility         = "private"
  version_control    = "Git"
  work_item_template = "Scrum"

  features = {
    "boards"       = "enabled"
    "repositories" = "enabled"
    "pipelines"    = "enabled"
    "testplans"    = "enabled"
    "artifacts"    = "enabled"
  }
}
```

## Managing Git Repositories

```hcl
# Create additional Git repositories within the project
resource "azuredevops_git_repository" "api" {
  project_id = azuredevops_project.main.id
  name       = "platform-api"

  initialization {
    init_type = "Clean"
  }
}

resource "azuredevops_git_repository" "infra" {
  project_id = azuredevops_project.main.id
  name       = "infrastructure"

  initialization {
    init_type = "Clean"
  }
}

resource "azuredevops_git_repository" "shared_libs" {
  project_id = azuredevops_project.main.id
  name       = "shared-libraries"

  initialization {
    init_type = "Clean"
  }
}

# Import a repository from GitHub
resource "azuredevops_git_repository" "imported" {
  project_id = azuredevops_project.main.id
  name       = "external-tool"

  initialization {
    init_type   = "Import"
    source_type = "Git"
    source_url  = "https://github.com/example/external-tool.git"
  }
}
```

## Branch Policies

Branch policies enforce code quality standards on protected branches:

```hcl
# Require minimum number of reviewers on the main branch
resource "azuredevops_branch_policy_min_reviewers" "main" {
  project_id = azuredevops_project.main.id

  enabled  = true
  blocking = true

  settings {
    reviewer_count                         = 2
    submitter_can_vote                     = false
    last_pusher_cannot_approve             = true
    allow_completion_with_rejects_or_waits = false
    on_push_reset_approved_votes           = true

    scope {
      repository_id  = azuredevops_git_repository.api.id
      repository_ref = "refs/heads/main"
      match_type     = "Exact"
    }
  }
}

# Require linked work items
resource "azuredevops_branch_policy_work_item_linking" "main" {
  project_id = azuredevops_project.main.id

  enabled  = true
  blocking = true

  settings {
    scope {
      repository_id  = azuredevops_git_repository.api.id
      repository_ref = "refs/heads/main"
      match_type     = "Exact"
    }
  }
}

# Require comment resolution
resource "azuredevops_branch_policy_comment_resolution" "main" {
  project_id = azuredevops_project.main.id

  enabled  = true
  blocking = true

  settings {
    scope {
      repository_id  = azuredevops_git_repository.api.id
      repository_ref = "refs/heads/main"
      match_type     = "Exact"
    }
  }
}

# Build validation policy (require CI to pass before merge)
resource "azuredevops_branch_policy_build_validation" "main" {
  project_id = azuredevops_project.main.id

  enabled  = true
  blocking = true

  settings {
    display_name        = "CI Build Validation"
    build_definition_id = azuredevops_build_definition.ci.id
    valid_duration      = 720 # 12 hours
    filename_patterns   = [
      "/src/*",
      "!/docs/*"
    ]

    scope {
      repository_id  = azuredevops_git_repository.api.id
      repository_ref = "refs/heads/main"
      match_type     = "Exact"
    }
  }
}
```

## Service Connections

Service connections let pipelines authenticate with external services:

```hcl
data "azurerm_client_config" "current" {}
data "azurerm_subscription" "current" {}

# Azure Resource Manager service connection using service principal
resource "azuredevops_serviceendpoint_azurerm" "production" {
  project_id            = azuredevops_project.main.id
  service_endpoint_name = "Azure Production"
  description           = "Service connection to Azure Production subscription"

  azurerm_spn_tenantid      = data.azurerm_client_config.current.tenant_id
  azurerm_subscription_id   = data.azurerm_subscription.current.subscription_id
  azurerm_subscription_name = "Production Subscription"

  credentials {
    serviceprincipalid  = var.sp_client_id
    serviceprincipalkey = var.sp_client_secret
  }
}

variable "sp_client_id" {
  type      = string
  sensitive = true
}

variable "sp_client_secret" {
  type      = string
  sensitive = true
}

# Docker Registry service connection
resource "azuredevops_serviceendpoint_dockerregistry" "acr" {
  project_id            = azuredevops_project.main.id
  service_endpoint_name = "ACR Production"
  docker_registry       = "https://myacr.azurecr.io"
  docker_username       = var.acr_username
  docker_password       = var.acr_password
  registry_type         = "Others"
}

variable "acr_username" {
  type      = string
  sensitive = true
}

variable "acr_password" {
  type      = string
  sensitive = true
}

# GitHub service connection
resource "azuredevops_serviceendpoint_github" "github" {
  project_id            = azuredevops_project.main.id
  service_endpoint_name = "GitHub"

  auth_personal {
    personal_access_token = var.github_pat
  }
}

variable "github_pat" {
  type      = string
  sensitive = true
}
```

## Variable Groups

Variable groups store values that can be shared across multiple pipelines:

```hcl
# Variable group for common settings
resource "azuredevops_variable_group" "common" {
  project_id   = azuredevops_project.main.id
  name         = "common-variables"
  description  = "Common variables shared across pipelines"
  allow_access = true

  variable {
    name  = "ENVIRONMENT"
    value = "production"
  }

  variable {
    name  = "REGION"
    value = "eastus"
  }

  variable {
    name  = "DOCKER_REGISTRY"
    value = "myacr.azurecr.io"
  }
}

# Variable group with secrets
resource "azuredevops_variable_group" "secrets" {
  project_id   = azuredevops_project.main.id
  name         = "pipeline-secrets"
  description  = "Secret variables for pipelines"
  allow_access = false # Restrict access

  variable {
    name         = "DB_PASSWORD"
    secret_value = var.db_password
    is_secret    = true
  }

  variable {
    name         = "API_KEY"
    secret_value = var.api_key
    is_secret    = true
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "api_key" {
  type      = string
  sensitive = true
}

# Variable group linked to Azure Key Vault
resource "azuredevops_variable_group" "keyvault" {
  project_id   = azuredevops_project.main.id
  name         = "keyvault-secrets"
  description  = "Secrets from Azure Key Vault"
  allow_access = true

  key_vault {
    name                = "kv-devops-prod"
    service_endpoint_id = azuredevops_serviceendpoint_azurerm.production.id
  }

  variable {
    name = "connection-string"
  }

  variable {
    name = "storage-key"
  }
}
```

## Build Definitions (Pipelines)

```hcl
# CI pipeline definition
resource "azuredevops_build_definition" "ci" {
  project_id = azuredevops_project.main.id
  name       = "Platform API - CI"
  path       = "\\Pipelines\\CI"

  ci_trigger {
    use_yaml = true
  }

  repository {
    repo_type   = "TfsGit"
    repo_id     = azuredevops_git_repository.api.id
    branch_name = "refs/heads/main"
    yml_path    = "azure-pipelines.yml"
  }

  variable_groups = [
    azuredevops_variable_group.common.id
  ]

  variable {
    name  = "BuildConfiguration"
    value = "Release"
  }
}

# CD pipeline definition
resource "azuredevops_build_definition" "cd" {
  project_id = azuredevops_project.main.id
  name       = "Platform API - CD"
  path       = "\\Pipelines\\CD"

  repository {
    repo_type   = "TfsGit"
    repo_id     = azuredevops_git_repository.api.id
    branch_name = "refs/heads/main"
    yml_path    = "azure-pipelines-cd.yml"
  }

  variable_groups = [
    azuredevops_variable_group.common.id,
    azuredevops_variable_group.secrets.id
  ]
}
```

## Environment and Approvals

```hcl
# Create deployment environments
resource "azuredevops_environment" "production" {
  project_id = azuredevops_project.main.id
  name       = "Production"
}

resource "azuredevops_environment" "staging" {
  project_id = azuredevops_project.main.id
  name       = "Staging"
}
```

## Team and Group Management

```hcl
# Create teams within the project
resource "azuredevops_team" "backend" {
  project_id = azuredevops_project.main.id
  name       = "Backend Team"
  description = "Backend developers"
}

resource "azuredevops_team" "devops" {
  project_id = azuredevops_project.main.id
  name       = "DevOps Team"
  description = "DevOps and platform engineers"
}

# Look up Azure DevOps groups
data "azuredevops_group" "contributors" {
  project_id = azuredevops_project.main.id
  name       = "Contributors"
}

data "azuredevops_group" "admins" {
  project_id = azuredevops_project.main.id
  name       = "Project Administrators"
}
```

## Outputs

```hcl
output "project_id" {
  description = "Azure DevOps project ID"
  value       = azuredevops_project.main.id
}

output "project_url" {
  description = "Azure DevOps project URL"
  value       = "https://dev.azure.com/my-organization/${azuredevops_project.main.name}"
}

output "api_repo_url" {
  description = "Platform API repository URL"
  value       = azuredevops_git_repository.api.remote_url
}

output "infra_repo_url" {
  description = "Infrastructure repository URL"
  value       = azuredevops_git_repository.infra.remote_url
}
```

## Using a Module for Standardized Projects

When every team needs the same project structure, use a module:

```hcl
# modules/devops-project/variables.tf
variable "name" {
  type = string
}

variable "description" {
  type    = string
  default = ""
}

variable "repositories" {
  type    = list(string)
  default = []
}

variable "require_reviewers" {
  type    = number
  default = 2
}

variable "azure_service_connection_id" {
  type    = string
  default = ""
}
```

```hcl
# modules/devops-project/main.tf
resource "azuredevops_project" "this" {
  name               = var.name
  description        = var.description
  visibility         = "private"
  version_control    = "Git"
  work_item_template = "Agile"

  features = {
    "boards"       = "enabled"
    "repositories" = "enabled"
    "pipelines"    = "enabled"
    "testplans"    = "disabled"
    "artifacts"    = "enabled"
  }
}

resource "azuredevops_git_repository" "repos" {
  for_each   = toset(var.repositories)
  project_id = azuredevops_project.this.id
  name       = each.value

  initialization {
    init_type = "Clean"
  }
}
```

```hcl
# Usage
module "team_alpha" {
  source      = "./modules/devops-project"
  name        = "team-alpha"
  description = "Team Alpha microservices"
  repositories = ["service-a", "service-b", "shared-libs"]
}

module "team_beta" {
  source      = "./modules/devops-project"
  name        = "team-beta"
  description = "Team Beta frontend applications"
  repositories = ["web-app", "mobile-app", "design-system"]
}
```

## Best Practices

**Use a dedicated Terraform project for DevOps configuration.** Keep your Azure DevOps Terraform code separate from your application infrastructure Terraform code. They have different lifecycles and different providers.

**Store the PAT securely.** Never hardcode the Personal Access Token in your Terraform files. Use environment variables (`AZDO_PERSONAL_ACCESS_TOKEN`) or a secrets manager. Consider using a service principal instead for automated pipelines.

**Standardize project creation with modules.** When every team gets the same project structure, a module ensures consistency. Include default branch policies, service connections, and variable groups in the module.

**Use Key Vault-linked variable groups.** For secrets needed by pipelines, link variable groups to Azure Key Vault rather than storing secrets directly in Azure DevOps. This provides centralized secret management and rotation.

**Enforce branch policies on protected branches.** Minimum reviewers, build validation, and comment resolution should be mandatory on main branches. These prevent accidental or unauthorized changes.

**Plan permissions carefully.** Use Azure DevOps groups and team structures to control access. Not every developer needs Project Administrator access.

## Conclusion

Managing Azure DevOps projects with Terraform brings the same infrastructure-as-code benefits to your development platform that you already get for your cloud resources. Consistent project structures, enforced branch policies, secure service connections, and properly configured pipelines - all defined as code, reviewed through pull requests, and applied automatically. As your organization grows, this approach scales much better than manual project creation.
