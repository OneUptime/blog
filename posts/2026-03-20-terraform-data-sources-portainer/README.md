# How to Use Terraform Data Sources to Read Portainer Resources (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Data Source, Infrastructure as Code, DevOps

Description: Learn how to use Terraform data sources to read existing Portainer resources and reference them without managing their lifecycle.

## What Are Terraform Data Sources?

Data sources let you read existing resources without managing (creating/deleting) them. This is useful when:

- You want to reference an existing environment without importing it.
- Multiple Terraform workspaces need to share resource references.
- You want to look up dynamic IDs without hardcoding them.

## Reading Environments

```hcl
# Read an existing Portainer environment by name

data "portainer_environment" "production" {
  name = "production"
}

# Use the environment ID in other resources
resource "portainer_stack" "myapp" {
  name               = "my-app"
  deployment_type    = "standalone"
  method             = "string"
  # Reference the data source instead of hardcoding the ID
  endpoint_id        = data.portainer_environment.production.id
  stack_file_content = file("docker-compose.yml")
}

output "production_endpoint_id" {
  value = data.portainer_environment.production.id
}
```

## Reading Users

```hcl
# Look up an existing user by username
data "portainer_user" "admin" {
  username = "admin"
}

data "portainer_user" "alice" {
  username = "alice.smith"
}

output "alice_user_id" {
  value = data.portainer_user.alice.id
}
```

## Reading Teams

```hcl
# Look up an existing team by name
data "portainer_team" "devops" {
  name = "devops"
}

# Add an existing user to the existing team
resource "portainer_team_membership" "new_member" {
  team_id = data.portainer_team.devops.id
  user_id = data.portainer_user.alice.id
  role    = 2
}
```

## Reading Registries

```hcl
# Read an existing registry to use its ID
data "portainer_registry" "harbor" {
  name = "Company Harbor"
}

# Allow a stack in the production environment to use the registry
resource "portainer_stack" "harbor_app" {
  name               = "harbor-backed-app"
  deployment_type    = "standalone"
  method             = "string"
  endpoint_id        = data.portainer_environment.production.id
  stack_file_content = file("docker-compose.yml")
  registries         = [data.portainer_registry.harbor.id]
}
```

## Cross-Workspace References

```hcl
# In the "shared" workspace, infrastructure is defined
# In the "app-team" workspace, reference shared infrastructure

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "mycompany-terraform-state"
    key    = "portainer/shared/terraform.tfstate"
    region = "us-east-1"
  }
}

# Reference the environment ID from the shared workspace
resource "portainer_stack" "app_team_stack" {
  name               = "app-team-app"
  deployment_type    = "standalone"
  method             = "string"
  # Use the output from the shared workspace
  endpoint_id        = data.terraform_remote_state.shared.outputs.production_environment_id
  stack_file_content = file("docker-compose.yml")
}
```

## Combining Data Sources with Resources

```hcl
# Read existing infrastructure, create new resources on top

# Read existing production environment
data "portainer_environment" "production" {
  name = "production"
}

# Read existing devops team
data "portainer_team" "devops" {
  name = "devops"
}

# Create a new stack in the existing environment
resource "portainer_stack" "new_service" {
  name               = "new-service"
  deployment_type    = "standalone"
  method             = "string"
  endpoint_id        = data.portainer_environment.production.id
  stack_file_content = file("stacks/new-service/docker-compose.yml")
}

# Grant the existing devops team access to the new environment we create
resource "portainer_environment" "new_env" {
  name                = "new-environment"
  type                = 1
  environment_address = "tcp://new-host:2375"

  team_access_policies = {
    (data.portainer_team.devops.id) = 2
  }
}
```

## Reading Multiple Known Environments

```hcl
# Read multiple known environments by name
locals {
  environment_names = toset(["production", "staging"])
}

data "portainer_environment" "selected" {
  for_each = local.environment_names

  name = each.key
}

output "environment_ids" {
  value = {
    for name, env in data.portainer_environment.selected :
    name => env.id
  }
}
```

## Conclusion

Terraform data sources for Portainer enable clean separation between resources that are managed in different workspaces or by different teams. Use them to reference existing environments and users without creating circular dependencies between Terraform configurations.
