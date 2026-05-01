# How to Deploy Stacks with Terraform and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Stack, Docker Compose, Deployment

Description: Learn how to deploy and manage Docker Compose stacks in Portainer using the Terraform provider for version-controlled deployments.

## Overview

The Portainer Terraform provider's `portainer_stack` resource lets you define Docker Compose stacks as code. Stack contents, environment variables, and Git source configurations are all managed declaratively.

## Basic Stack from Inline Content

```hcl
# stacks.tf

resource "portainer_stack" "nginx" {
  name            = "nginx-proxy"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = portainer_environment.production.id

  # Inline Compose content
  stack_file_content = <<-EOT
    version: "3.8"
    services:
      nginx:
        image: nginx:${var.nginx_version}
        ports:
          - "80:80"
          - "443:443"
        restart: unless-stopped
  EOT

  # Environment variables for the stack
  env {
    name  = "NGINX_VERSION"
    value = var.nginx_version
  }
}

variable "nginx_version" {
  default = "1.25-alpine"
}
```

## Stack from a File

```hcl
resource "portainer_stack" "monitoring" {
  name            = "monitoring"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id

  # Load Compose file from disk
  stack_file_path = "${path.module}/stacks/monitoring/docker-compose.yml"

  env {
    name  = "GRAFANA_PASSWORD"
    value = var.grafana_password
  }

  env {
    name  = "PROMETHEUS_RETENTION"
    value = "30d"
  }
}
```

## Stack from a Template File with Variable Substitution

```hcl
resource "portainer_stack" "app" {
  name            = "my-app"
  deployment_type = "swarm"
  method          = "string"
  endpoint_id     = portainer_environment.production.id

  # Use templatefile for dynamic content
  stack_file_content = templatefile("${path.module}/templates/app-compose.tpl", {
    image_tag    = var.app_image_tag
    app_env      = "production"
    db_host      = "postgres.production.svc"
    replicas     = 3
  })

  env {
    name  = "IMAGE_TAG"
    value = var.app_image_tag
  }
}
```

```text
# templates/app-compose.tpl

version: "3.8"

services:
  app:
    image: registry.mycompany.com/myapp:${image_tag}
    environment:
      - APP_ENV=${app_env}
      - DB_HOST=${db_host}
    deploy:
      replicas: ${replicas}
```

## Stack from a Git Repository

```hcl
resource "portainer_stack" "git_app" {
  name            = "git-backed-app"
  deployment_type = "standalone"
  method          = "repository"
  endpoint_id     = portainer_environment.production.id

  # Deploy from Git repository
  repository_url             = "https://github.com/myorg/my-app"
  repository_reference_name  = "refs/heads/main"
  file_path_in_repository    = "docker/docker-compose.yml"

  # Authentication for private repos
  git_repository_authentication = true
  repository_username           = var.git_username
  repository_password           = var.git_token

  # Enable a GitOps webhook and pull images on redeploy
  stack_webhook = true
  pull_image    = true
}
```

## Multiple Stacks with Dependency Ordering

```hcl
# Deploy infrastructure stacks before application stacks
resource "portainer_stack" "database" {
  name            = "database"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id
  stack_file_path = "${path.module}/stacks/database/docker-compose.yml"
}

resource "portainer_stack" "application" {
  name            = "application"
  deployment_type = "standalone"
  method          = "file"
  endpoint_id     = portainer_environment.production.id
  stack_file_path = "${path.module}/stacks/app/docker-compose.yml"

  # Ensure database is deployed first
  depends_on = [portainer_stack.database]
}
```

## Updating a Stack

Change the variable or file content, then:

```bash
# Preview the stack update
terraform plan

# Apply the update (Portainer redeployes the stack)
terraform apply
```

## Stack Outputs

```hcl
output "stack_ids" {
  value = {
    monitoring = portainer_stack.monitoring.id
    app        = portainer_stack.app.id
  }
}
```

## Conclusion

The Portainer Terraform provider's stack resource enables true infrastructure-as-code for Docker Compose deployments. Version-control your stack definitions, review changes through pull requests, and apply them via Terraform for a clean, auditable deployment workflow.
