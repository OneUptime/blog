# How to Use the Official Portainer Terraform Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Infrastructure, DevOps, Automation

Description: Learn how to set up and use the official Portainer Terraform provider to manage your Portainer resources as code, enabling reproducible infrastructure deployments.

## Introduction

The Portainer Terraform provider allows you to manage Portainer resources - environments, users, teams, registries, and stacks - using Terraform's declarative infrastructure-as-code approach. This enables version-controlled, reproducible Portainer configurations that integrate with your broader IaC workflow.

## Prerequisites

- Terraform v1.0+ installed
- Portainer CE or BE running and accessible
- Portainer API access token (admin level)
- Basic familiarity with Terraform

## Step 1: Install the Portainer Terraform Provider

Create a `versions.tf` file:

```hcl
# versions.tf

terraform {
  required_version = ">= 1.0"

  required_providers {
    portainer = {
      source  = "portainer/portainer"
      version = "~> 1.0"
    }
  }
}
```

Initialize Terraform:

```bash
terraform init
```

## Step 2: Configure the Provider

```hcl
# provider.tf
provider "portainer" {
  endpoint        = var.portainer_endpoint
  api_key         = var.portainer_api_key  # Use variable, not hardcode
  skip_ssl_verify = false                  # Set true only for self-signed certs in dev
}
```

Create a `variables.tf`:

```hcl
# variables.tf
variable "portainer_api_key" {
  description = "Portainer API access token"
  type        = string
  sensitive   = true
}

variable "portainer_endpoint" {
  description = "Portainer server URL"
  type        = string
  default     = "https://portainer.example.com"
}
```

Create `terraform.tfvars` (add to `.gitignore`):

```hcl
# terraform.tfvars - DO NOT commit to version control
portainer_api_key = "YOUR_PORTAINER_API_KEY"
```

## Step 3: Create Your First Resource

### Manage a User

```hcl
# users.tf
resource "portainer_user" "developer" {
  username = "john.doe"
  password = var.initial_user_password
  role     = 2  # 1 = admin, 2 = standard user
}

variable "initial_user_password" {
  description = "Initial password for the new Portainer user"
  type        = string
  sensitive   = true
}

output "developer_id" {
  value = portainer_user.developer.id
}
```

### Manage a Team

```hcl
# teams.tf
resource "portainer_team" "backend" {
  name = "backend-engineers"
}

resource "portainer_team_membership" "john_backend" {
  team_id = portainer_team.backend.id
  user_id = portainer_user.developer.id
  role    = 2  # 1 = team leader, 2 = member
}
```

## Step 4: Manage an Environment

```hcl
# environments.tf
resource "portainer_environment" "production" {
  name                = "production"
  environment_address = "tcp://192.168.1.100:2376"
  type                = 1  # Docker standalone
  tls_enabled         = true
  tls_skip_verify     = false
  tls_ca_cert         = file("certs/ca.pem")
  tls_cert            = file("certs/cert.pem")
  tls_key             = file("certs/key.pem")

  tag_ids = [
    portainer_tag.production.id
  ]
}

resource "portainer_tag" "production" {
  name = "production"
}
```

## Step 5: Deploy a Stack

```hcl
# stacks.tf
resource "portainer_stack" "myapp" {
  name               = "my-app"
  deployment_type    = "standalone"
  method             = "string"
  endpoint_id        = portainer_environment.production.id
  stack_file_content = file("stacks/myapp/docker-compose.yml")

  env {
    name  = "IMAGE_TAG"
    value = var.app_image_tag
  }

  env {
    name  = "APP_ENV"
    value = "production"
  }
}

variable "app_image_tag" {
  description = "Container image tag to deploy"
  type        = string
  default     = "latest"
}
```

## Step 6: Manage a Registry

```hcl
# registries.tf
resource "portainer_registry" "company_harbor" {
  name           = "Company Harbor"
  type           = 3  # Custom registry
  url            = "registry.company.com"
  authentication = true
  username       = var.registry_username
  password       = var.registry_password
}

variable "registry_username" {
  description = "Registry service account username"
  type        = string
}

variable "registry_password" {
  description = "Registry service account password"
  type        = string
  sensitive   = true
}
```

## Step 7: Full Example - Complete Portainer Setup

```hcl
# main.tf - Complete Portainer infrastructure

# ===== Environment =====
resource "portainer_environment" "production" {
  name                = "production-docker"
  environment_address = "unix:///var/run/docker.sock"
  type                = 1
}

# ===== Tags =====
resource "portainer_tag" "env_production" {
  name = "env:production"
}

# ===== Teams =====
resource "portainer_team" "devops" {
  name = "devops"
}

resource "portainer_team" "backend" {
  name = "backend"
}

# ===== Registry =====
resource "portainer_registry" "ghcr" {
  name           = "GitHub Container Registry"
  type           = 3  # Custom registry
  url            = "ghcr.io"
  authentication = true
  username       = var.registry_username
  password       = var.registry_password
}

# ===== Stacks =====
resource "portainer_stack" "monitoring" {
  name               = "monitoring"
  deployment_type    = "standalone"
  method             = "string"
  endpoint_id        = portainer_environment.production.id
  stack_file_content = file("stacks/monitoring/docker-compose.yml")
}

resource "portainer_stack" "application" {
  name               = "my-app"
  deployment_type    = "standalone"
  method             = "string"
  endpoint_id        = portainer_environment.production.id
  stack_file_content = templatefile("stacks/myapp/docker-compose.yml", {
    image_tag = var.app_image_tag
    app_env   = "production"
  })

  depends_on = [portainer_stack.monitoring]
}
```

## Step 8: Apply and Manage

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy resources managed by this configuration
terraform destroy

# Check state
terraform state list
terraform show
```

## Conclusion

The Portainer Terraform provider brings infrastructure-as-code practices to Portainer management. Define your users, teams, environments, registries, and stacks in Terraform configuration files, commit them to version control, and apply changes through your standard IaC pipeline. This enables GitOps for Portainer itself, ensuring every change is reviewed, tested, and audited before being applied.
