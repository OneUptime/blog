# How to Use Terraform Data Sources to Read Portainer Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Data Source, Infrastructure, DevOps

Description: Learn how to use Terraform data sources to read and reference existing Portainer resources - environments, users, teams, and stacks - without managing them directly.

## Introduction

Terraform data sources let you read information about existing resources without taking ownership of them. In Portainer's Terraform provider, data sources allow you to reference environments, users, teams, and registries created outside of Terraform (e.g., manually in the UI or by another Terraform project). This is essential for modular infrastructure where different teams manage different parts of Portainer.

## Prerequisites

- Portainer Terraform provider configured
- Existing Portainer resources to reference
- Terraform v1.0+

## Understanding Data Sources vs Resources

```hcl
# Resource - Terraform creates and manages this

resource "portainer_environment" "production" {
  name                = "production"
  environment_address = "tcp://production.example.com:9001"
  type                = 2
}

# Data source - Terraform reads this, doesn't manage it
data "portainer_environment" "production" {
  name = "production"  # Read existing environment named "production"
}
```

## Step 1: Read an Existing Environment

```hcl
# data.tf - Read environments created elsewhere

# Read environment by name
data "portainer_environment" "production" {
  name = "production"
}

data "portainer_environment" "staging" {
  name = "staging"
}

# Use the data source in resources
resource "portainer_stack" "myapp_prod" {
  name            = "myapp"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = data.portainer_environment.production.id  # Use the read ID

  stack_file_content = file("docker-compose.yml")
}

resource "portainer_stack" "myapp_staging" {
  name            = "myapp-staging"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = data.portainer_environment.staging.id

  stack_file_content = file("docker-compose.yml")
}
```

## Step 2: Read Existing Users

```hcl
# Read an existing user to reference in team memberships
data "portainer_user" "existing_admin" {
  username = "existing.admin"
}

data "portainer_user" "service_account" {
  username = "ci-service-account"
}

# Add the existing user to a team managed by Terraform
resource "portainer_team_membership" "admin_devops" {
  team_id = portainer_team.devops.id
  user_id = data.portainer_user.existing_admin.id
  role    = 1  # Team leader
}
```

## Step 3: Read Existing Teams

```hcl
# Read existing teams to grant environment access
data "portainer_team" "backend_team" {
  name = "backend-engineers"
}

data "portainer_team" "ops_team" {
  name = "operations"
}

# Grant the existing team access to a new environment
data "portainer_role" "environment_admin" {
  name = "Environment administrator"
}

resource "portainer_environment" "new_cluster" {
  name                = "new-k8s-cluster"
  environment_address = "tcp://new-cluster.example.com:9001"
  type                = 6

  team_access_policies = {
    (data.portainer_team.ops_team.id) = tonumber(data.portainer_role.environment_admin.id)
  }
}
```

## Step 4: Read Existing Registries

```hcl
# Read a registry configured by another team/module
data "portainer_registry" "company_harbor" {
  name = "Company Harbor"
}

# Output the registry ID for use by other modules
output "harbor_registry_id" {
  description = "ID of the Company Harbor registry"
  value       = data.portainer_registry.company_harbor.id
}
```

## Step 5: Cross-Module Data Sharing

Use data sources to share resources across Terraform modules:

```hcl
# Module A: portainer-base - Creates foundational resources
# outputs.tf in module A
output "production_env_id" {
  value = portainer_environment.production.id
}

output "devops_team_id" {
  value = portainer_team.devops.id
}
```

```hcl
# Module B: portainer-apps - Deploys applications
# Reads state from Module A using remote state data source

data "terraform_remote_state" "portainer_base" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "portainer/base/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "portainer_stack" "myapp" {
  name            = "myapp"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = data.terraform_remote_state.portainer_base.outputs.production_env_id

  stack_file_content = file("docker-compose.yml")
}
```

## Step 6: List Data Sources for Discovery

```hcl
# The provider does not expose a `portainer_environments` data source.
# For discovery-style lookups, `portainer_role` can return all available roles.
data "portainer_role" "all" {}

output "available_role_ids" {
  value = {
    for role in data.portainer_role.all.roles :
    role.name => role.id
  }
}
```

## Step 7: Conditional Logic with Data Sources

```hcl
# Conditionally reference different environments based on workspace
locals {
  target_environment = terraform.workspace == "production" ? "production" : "staging"
}

data "portainer_environment" "target" {
  name = local.target_environment
}

resource "portainer_stack" "app" {
  name            = "myapp"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = data.portainer_environment.target.id

  stack_file_content = terraform.workspace == "production" ?
    file("docker-compose.prod.yml") :
    file("docker-compose.staging.yml")
}
```

## Step 8: Complete Example

```hcl
# main.tf - Use data sources to deploy into existing infrastructure

# Read infrastructure created by another team
data "portainer_environment" "prod" {
  name = "production"
}

data "portainer_team" "devops" {
  name = "platform-devops"
}

data "portainer_registry" "harbor" {
  name = "Company Harbor"
}

# Deploy a new stack into the existing environment
resource "portainer_stack" "new_service" {
  name            = "new-service"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = data.portainer_environment.prod.id

  stack_file_content = templatefile("docker-compose.yml", {
    registry  = data.portainer_registry.harbor.url
    image_tag = var.image_tag
  })

  ownership        = "restricted"
  authorized_teams = [tonumber(data.portainer_team.devops.id)]

  env {
    name  = "SERVICE_NAME"
    value = "new-service"
  }
}
```

## Conclusion

Terraform data sources for Portainer enable clean separation of concerns between teams managing different aspects of infrastructure. Use data sources when you need to reference but not own a resource, cross-module state when sharing outputs between Terraform configurations, and workspace-based conditionals for environment-specific deployments. This approach prevents resource ownership conflicts while enabling modular, collaborative infrastructure management.
