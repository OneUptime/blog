# How to Deploy Stacks with Terraform and Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Stack, Docker, Infrastructure

Description: Learn how to deploy and manage Docker Compose stacks in Portainer using Terraform, enabling version-controlled, repeatable stack deployments as part of your infrastructure pipeline.

## Introduction

Using Terraform to manage Portainer stacks enables declarative stack deployments where your Compose file content, environment variables, and deployment parameters are all defined in code. This guide covers deploying stacks from inline content, files, and Git repositories using the Portainer Terraform provider.

## Prerequisites

- Portainer Terraform provider configured
- At least one Portainer environment registered
- Docker Compose files for your applications

## Step 1: Deploy a Stack from Inline Content

```hcl
# stacks.tf - Inline stack content

resource "portainer_stack" "nginx" {
  name            = "nginx-proxy"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = portainer_environment.production.id

  stack_file_content = <<-EOT
    version: "3.8"
    services:
      nginx:
        image: nginx:1.25
        restart: unless-stopped
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - nginx_conf:/etc/nginx/conf.d
          - nginx_certs:/etc/nginx/certs
    volumes:
      nginx_conf:
      nginx_certs:
  EOT
}
```

## Step 2: Deploy a Stack from a File

```hcl
# stacks.tf - Stack content from file

resource "portainer_stack" "wordpress" {
  name            = "wordpress"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id

  # Read compose file from disk
  stack_file_path = "${path.module}/stacks/wordpress/docker-compose.yml"

  env {
    name  = "WORDPRESS_DB_PASSWORD"
    value = var.wordpress_db_password
  }

  env {
    name  = "MYSQL_ROOT_PASSWORD"
    value = var.mysql_root_password
  }
}

variable "wordpress_db_password" {
  description = "WordPress database password"
  type        = string
  sensitive   = true
}

variable "mysql_root_password" {
  description = "MySQL root password"
  type        = string
  sensitive   = true
}
```

## Step 3: Deploy a Stack from a Template File

Use Terraform's `templatefile` function for dynamic Compose content. For a Swarm deployment, you can template replica counts:

```hcl
# stacks.tf - Templated stack

locals {
  app_config = {
    image_tag     = var.app_image_tag
    app_env       = var.app_environment
    replica_count = var.replica_count
    registry      = "ghcr.io/my-org"
  }
}

resource "portainer_stack" "application" {
  name            = "my-application"
  deployment_type = "swarm"
  method          = "string"
  endpoint_id     = portainer_environment.production.id

  stack_file_content = templatefile(
    "${path.module}/stacks/app/docker-compose.tftpl",
    local.app_config
  )

  env {
    name  = "DATABASE_URL"
    value = var.database_url
  }

  env {
    name  = "REDIS_URL"
    value = "redis://redis:6379"
  }
}
```

`stacks/app/docker-compose.tftpl`:

```yaml
version: "3.8"
services:
  app:
    image: ${registry}/myapp:${image_tag}
    deploy:
      replicas: ${replica_count}
    environment:
      APP_ENV: ${app_env}
```

## Step 4: Deploy a Git-Connected Stack

```hcl
# git_stacks.tf - Stack from Git repository

resource "portainer_stack" "infrastructure" {
  name            = "infra-stack"
  deployment_type = "standalone"
  method          = "repository"
  endpoint_id     = portainer_environment.production.id

  repository_url            = "https://github.com/your-org/infrastructure"
  repository_reference_name = "refs/heads/main"
  file_path_in_repository   = "stacks/production/docker-compose.yml"

  # Authentication for private repos
  git_repository_authentication = true
  repository_username           = var.github_username
  repository_password           = var.github_token  # PAT or token with repository read access

  # Auto-update configuration
  update_interval = "5m"
  force_update    = false

  env {
    name  = "IMAGE_TAG"
    value = var.app_image_tag
  }
}
```

## Step 5: Multiple Stacks with for_each

```hcl
# variables.tf
variable "stacks" {
  description = "Map of stack configurations"
  type = map(object({
    compose_file = string
    env_vars     = map(string)
  }))
}

# stacks_dynamic.tf
resource "portainer_stack" "apps" {
  for_each = var.stacks

  name            = each.key
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id

  stack_file_path = "${path.module}/stacks/${each.value.compose_file}"

  dynamic "env" {
    for_each = each.value.env_vars
    content {
      name  = env.key
      value = env.value
    }
  }
}
```

With `terraform.tfvars`:

```hcl
stacks = {
  "frontend" = {
    compose_file = "frontend/docker-compose.yml"
    env_vars = {
      API_URL   = "https://api.example.com"
      APP_ENV   = "production"
    }
  }
  "api" = {
    compose_file = "api/docker-compose.yml"
    env_vars = {
      DATABASE_URL = "postgresql://..."
      REDIS_URL    = "redis://redis:6379"
    }
  }
}
```

## Step 6: Stack Dependency Ordering

```hcl
# Deploy in Terraform order: network deps → databases → application

resource "portainer_stack" "networking" {
  name            = "networking"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id
  stack_file_path = "${path.module}/stacks/networking/docker-compose.yml"
}

resource "portainer_stack" "databases" {
  name            = "databases"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id
  stack_file_path = "${path.module}/stacks/databases/docker-compose.yml"

  depends_on = [portainer_stack.networking]
}

resource "portainer_stack" "application" {
  name            = "application"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id
  stack_file_path = "${path.module}/stacks/app/docker-compose.yml"

  depends_on = [portainer_stack.databases]
}
```

## Step 7: Managing Stack Environment Variables with Sensitive Inputs

```hcl
# Sensitive variables redact CLI output, but stack env values still end up in Terraform state
variable "stack_secrets" {
  description = "Sensitive environment variables for stacks"
  type = map(string)
  sensitive = true
}

resource "portainer_stack" "secure_app" {
  name            = "secure-app"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id

  stack_file_path = "${path.module}/stacks/secure-app/docker-compose.yml"

  # Mix of non-sensitive and sensitive env vars
  env {
    name  = "APP_ENV"
    value = "production"
  }

  env {
    name  = "DATABASE_URL"
    value = var.stack_secrets["database_url"]
  }

  env {
    name  = "JWT_SECRET"
    value = var.stack_secrets["jwt_secret"]
  }

  env {
    name  = "API_KEY"
    value = var.stack_secrets["api_key"]
  }
}
```

## Conclusion

Deploying Portainer stacks with Terraform brings stack deployments into your IaC workflow. Stack configuration, environment variables, and deployment parameters are version-controlled alongside your infrastructure. Use `templatefile` for dynamic compose generation, Git-connected stacks for auto-deployment, and `depends_on` for Terraform apply ordering between related stacks. Use Terraform Cloud or Vault to source sensitive values, and protect your Terraform state because stack environment variables are still persisted there.
