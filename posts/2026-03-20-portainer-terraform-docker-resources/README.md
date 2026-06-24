# How to Manage Docker Resources via Portainer Terraform Provider (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Docker, Infrastructure, DevOps

Description: Learn how to manage Docker containers, networks, volumes, and images through the Portainer Terraform provider for fully declarative container infrastructure management.

## Introduction

The Portainer Terraform provider allows you to manage not just Portainer configuration but also the underlying Docker resources through Portainer's API proxy. This means you can define images, networks, and volumes as Terraform resources, and use Portainer stacks to declaratively deploy the containers that consume them.

## Prerequisites

- Portainer Terraform provider configured
- Docker environment registered in Portainer
- Terraform v1.0+

## Step 1: Managing Docker Images

```hcl
# images.tf

# Pull a public image

resource "portainer_docker_image" "nginx" {
  endpoint_id = portainer_environment.production.id
  image       = "nginx:1.25"
}

# Pull a private image with registry authentication
resource "portainer_docker_image" "private_app" {
  endpoint_id   = portainer_environment.production.id
  image         = "ghcr.io/my-org/myapp:${var.app_image_tag}"
  registry_auth = "${var.registry_username}:${var.registry_password}"
}
```

## Step 2: Managing Docker Networks

```hcl
# networks.tf

# Custom bridge network
resource "portainer_docker_network" "app_network" {
  endpoint_id = portainer_environment.production.id
  name        = "app-network"
  driver      = "bridge"

  ipam_config {
    subnet  = "172.30.0.0/16"
    gateway = "172.30.0.1"
  }

  options = {
    "com.docker.network.bridge.name" = "app-br"
  }

  labels = {
    "managed-by" = "terraform"
    "project"    = "myapp"
  }
}

# Overlay network for Swarm
resource "portainer_docker_network" "swarm_overlay" {
  endpoint_id = portainer_environment.production_swarm.id
  name        = "swarm-overlay"
  driver      = "overlay"
  attachable  = true  # Allow standalone containers to attach

  ipam_config {
    subnet = "10.20.0.0/16"
  }
}
```

## Step 3: Managing Docker Volumes

```hcl
# volumes.tf

# Named volume for persistent data
resource "portainer_docker_volume" "postgres_data" {
  endpoint_id = portainer_environment.production.id
  name        = "postgres_data"
  driver      = "local"

  labels = {
    "managed-by" = "terraform"
    "backup"     = "required"
    "app"        = "postgresql"
  }
}

resource "portainer_docker_volume" "redis_data" {
  endpoint_id = portainer_environment.production.id
  name        = "redis_data"
  driver      = "local"

  labels = {
    "managed-by" = "terraform"
    "app"        = "redis"
  }
}

# NFS volume
resource "portainer_docker_volume" "shared_uploads" {
  endpoint_id = portainer_environment.production.id
  name        = "shared_uploads"
  driver      = "local"

  driver_opts = {
    type   = "nfs"
    o      = "addr=192.168.1.100,rw"
    device = ":/mnt/shared/uploads"
  }
}
```

## Step 4: Complete Application Stack with All Resources

```hcl
# complete_app.tf - Full application with all Docker resources

# Network
resource "portainer_docker_network" "myapp_net" {
  endpoint_id = portainer_environment.production.id
  name        = "myapp-network"
  driver      = "bridge"
}

# Volumes
resource "portainer_docker_volume" "db_data" {
  endpoint_id = portainer_environment.production.id
  name        = "myapp-db-data"
  driver      = "local"
}

resource "portainer_docker_volume" "app_uploads" {
  endpoint_id = portainer_environment.production.id
  name        = "myapp-uploads"
  driver      = "local"
}

# Pull the application image ahead of deployment
resource "portainer_docker_image" "myapp" {
  endpoint_id   = portainer_environment.production.id
  image         = "ghcr.io/myorg/myapp:${var.image_tag}"
  registry_auth = "${var.registry_username}:${var.registry_password}"
}

# Deploy the containers as a Portainer-managed standalone stack
resource "portainer_stack" "myapp" {
  endpoint_id      = portainer_environment.production.id
  name             = "myapp"
  deployment_type  = "standalone"
  method           = "string"

  depends_on = [
    portainer_docker_network.myapp_net,
    portainer_docker_volume.db_data,
    portainer_docker_volume.app_uploads,
    portainer_docker_image.myapp
  ]

  stack_file_content = <<-EOT
    services:
      database:
        image: postgres:15-alpine
        restart: unless-stopped
        environment:
          POSTGRES_DB: myapp
          POSTGRES_USER: myapp
          POSTGRES_PASSWORD: $${DB_PASSWORD}
        volumes:
          - myapp-db-data:/var/lib/postgresql/data
        networks:
          - myapp-network

      app:
        image: ghcr.io/myorg/myapp:$${IMAGE_TAG}
        restart: unless-stopped
        ports:
          - "8080:3000"
        environment:
          DATABASE_URL: postgresql://myapp:$${DB_PASSWORD}@database:5432/myapp
        volumes:
          - myapp-uploads:/app/uploads
        networks:
          - myapp-network
        depends_on:
          - database

    networks:
      myapp-network:
        external: true
        name: myapp-network

    volumes:
      myapp-db-data:
        external: true
        name: myapp-db-data
      myapp-uploads:
        external: true
        name: myapp-uploads
  EOT

  env {
    name  = "DB_PASSWORD"
    value = var.db_password
  }

  env {
    name  = "IMAGE_TAG"
    value = var.image_tag
  }
}

# Outputs
output "app_url" {
  value = "http://${var.host_ip}:8080"
}
```

## Step 5: Validate and Apply

```bash
# Initialize the working directory
terraform init

# Validate configuration
terraform validate

# Plan - see all resources to be created
terraform plan

# Apply - create all Docker resources
terraform apply

# View created resources in Portainer
# Or check via Docker on the target host
docker ps
docker network ls
docker volume ls
```

## Conclusion

Managing Docker resources via the Portainer Terraform provider gives you full declarative control over images, networks, volumes, and Compose-based application stacks. Resources are defined in code, changes are reviewed through pull requests, and the Terraform state file tracks the managed Portainer and Docker resources. This approach is particularly valuable for reproducible deployment environments, disaster recovery scenarios, and ensuring environment parity between staging and production.
