# How to Manage Docker Resources via Portainer Terraform Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Terraform, Docker, Infrastructure as Code, Automation

Description: Learn how to manage Docker containers, networks, and volumes in Portainer environments using the Terraform provider.

## Overview

Beyond stacks and environments, the Portainer Terraform provider supports managing individual Docker resources such as custom networks and named volumes as code. For container workloads, use `portainer_stack` for Compose-based deployments and supporting resources like `portainer_deploy` or `portainer_container_exec` for rollout and operational tasks.

## Managing Docker Networks

```hcl
# networks.tf

# Create a custom bridge network

resource "portainer_docker_network" "app_network" {
  endpoint_id = portainer_environment.production.id

  name   = "app-network"
  driver = "bridge"

  ipam_config {
    subnet  = "172.20.0.0/16"
    gateway = "172.20.0.1"
  }

  options = {
    "com.docker.network.bridge.name" = "app-br0"
  }
}

# Create an overlay network for Swarm
resource "portainer_docker_network" "swarm_overlay" {
  endpoint_id = portainer_environment.swarm.id

  name       = "swarm-overlay"
  driver     = "overlay"
  scope      = "swarm"
  attachable = true

  options = {
    "com.docker.network.driver.mtu" = "1450"
  }
}
```

## Managing Docker Volumes

```hcl
# volumes.tf

resource "portainer_docker_volume" "postgres_data" {
  endpoint_id = portainer_environment.production.id

  name   = "postgres-data"
  driver = "local"

  driver_opts = {
    type   = "none"
    device = "/mnt/fast-disk/postgres"
    o      = "bind"
  }

  labels = {
    "managed-by" = "terraform"
    "app"        = "database"
  }
}

resource "portainer_docker_volume" "uploads" {
  endpoint_id = portainer_environment.production.id
  name        = "app-uploads"
  driver      = "local"
}
```

## Managing Standalone Containers

The current Portainer Terraform provider does not expose a `portainer_container` resource. To manage container workloads in Portainer, deploy them as a `portainer_stack` and use supporting resources such as `portainer_container_exec` or `portainer_deploy` when needed.

```hcl
# containers.tf

# Deploy a single-container workload as a standalone stack
resource "portainer_stack" "redis" {
  name            = "redis"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = portainer_environment.production.id

  stack_file_content = <<-EOT
    services:
      redis:
        image: redis:7-alpine
        command:
          - redis-server
          - --requirepass
          - "$${REDIS_PASSWORD}"
        restart: unless-stopped
        ports:
          - "6379:6379"
        volumes:
          - redis-data:/data
        networks:
          - app-network

    volumes:
      redis-data: {}

    networks:
      app-network:
        external: true
        name: "$${APP_NETWORK_NAME}"
  EOT

  env {
    name  = "REDIS_PASSWORD"
    value = var.redis_password
  }

  env {
    name  = "APP_NETWORK_NAME"
    value = portainer_docker_network.app_network.name
  }
}
```

## Complete Application Stack with Docker Resources and a Stack

```hcl
# main.tf - Create network and volume resources, then deploy containers as a stack

# Step 1: Create the network
resource "portainer_docker_network" "myapp" {
  endpoint_id = portainer_environment.production.id
  name        = "myapp-net"
  driver      = "bridge"
}

# Step 2: Create the data volume
resource "portainer_docker_volume" "db_data" {
  endpoint_id = portainer_environment.production.id
  name        = "myapp-db-data"
}

# Step 3: Deploy the containers as a standalone stack
resource "portainer_stack" "myapp" {
  name            = "myapp"
  deployment_type = "standalone"
  method          = "string"
  endpoint_id     = portainer_environment.production.id

  stack_file_content = <<-EOT
    services:
      postgres:
        image: postgres:15-alpine
        restart: unless-stopped
        environment:
          POSTGRES_DB: myapp
          POSTGRES_PASSWORD: "$${DB_PASSWORD}"
        volumes:
          - db-data:/var/lib/postgresql/data
        networks:
          - myapp-net

      app:
        image: "registry.mycompany.com/myapp:$${IMAGE_TAG}"
        restart: unless-stopped
        environment:
          DB_HOST: postgres
          DB_PASSWORD: "$${DB_PASSWORD}"
        ports:
          - "8080:8080"
        networks:
          - myapp-net

    volumes:
      db-data:
        external: true
        name: "$${DB_VOLUME_NAME}"

    networks:
      myapp-net:
        external: true
        name: "$${APP_NETWORK_NAME}"
  EOT

  env {
    name  = "DB_PASSWORD"
    value = var.db_password
  }

  env {
    name  = "IMAGE_TAG"
    value = var.image_tag
  }

  env {
    name  = "DB_VOLUME_NAME"
    value = portainer_docker_volume.db_data.name
  }

  env {
    name  = "APP_NETWORK_NAME"
    value = portainer_docker_network.myapp.name
  }
}
```

## Conclusion

The Portainer Terraform provider lets you manage Docker networks and volumes directly, while container lifecycle management is handled through `portainer_stack` for Compose deployments and helper resources such as `portainer_deploy` and `portainer_container_exec`. For complex multi-container applications, `portainer_stack` remains the simplest way to manage services in Portainer.
