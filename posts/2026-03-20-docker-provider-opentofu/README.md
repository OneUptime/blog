# How to Configure the Docker Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Infrastructure as Code, IaC, Docker Provider

Description: Learn how to configure the OpenTofu Docker provider to manage containers, images, networks, and volumes.

## Introduction

This guide covers how to configure the Docker provider in OpenTofu with practical examples and common best practices.

## Prerequisites

- OpenTofu v1.6+
- Access to a Docker daemon
- Permission to access the Docker socket or remote Docker host

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.2"
    }
  }
}

provider "docker" {
  host = var.docker_host
}
```

## Step 2: Define Variables

```hcl
variable "docker_host" {
  description = "Docker daemon endpoint. On Windows use npipe:////./pipe/docker_engine."
  type        = string
  default     = "unix:///var/run/docker.sock"
}

variable "container_name" {
  description = "Name of the Docker container"
  type        = string
  default     = "app"
}

variable "container_image" {
  description = "Container image to run"
  type        = string
  default     = "nginx:latest"
}

variable "container_port" {
  description = "Port exposed by the container image"
  type        = number
  default     = 80
}

variable "host_port" {
  description = "Port exposed on the Docker host"
  type        = number
  default     = 8080
}

variable "network_name" {
  description = "Docker network name"
  type        = string
  default     = "app-network"
}

variable "volume_name" {
  description = "Docker volume name"
  type        = string
  default     = "app-data"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
```

## Step 3: Create Core Docker Resources

```hcl
resource "docker_image" "app" {
  name = var.container_image
}

resource "docker_network" "app" {
  name   = var.network_name
  driver = "bridge"

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}

resource "docker_volume" "app" {
  name = var.volume_name

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}
```

## Step 4: Deploy Workloads

```hcl
resource "docker_container" "app" {
  name  = var.container_name
  image = docker_image.app.image_id

  restart = "unless-stopped"

  env = [
    "APP_ENV=${var.environment}"
  ]

  networks_advanced {
    name = docker_network.app.name
  }

  volumes {
    volume_name    = docker_volume.app.name
    container_path = "/data"
  }

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}
```

## Step 5: Expose the Workload

```hcl
resource "docker_container" "app" {
  name  = var.container_name
  image = docker_image.app.image_id

  restart = "unless-stopped"

  ports {
    internal = var.container_port
    external = var.host_port
  }

  env = [
    "APP_ENV=${var.environment}"
  ]

  networks_advanced {
    name = docker_network.app.name
  }

  volumes {
    volume_name    = docker_volume.app.name
    container_path = "/data"
  }

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}
```

## Step 6: Define Outputs

```hcl
output "container_name" {
  value = docker_container.app.name
}

output "container_id" {
  value = docker_container.app.id
}

output "network_name" {
  value = docker_network.app.name
}

output "volume_name" {
  value = docker_volume.app.name
}

output "published_port" {
  value = var.host_port
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Pin image tags instead of relying on `latest` in production
- Use named networks and volumes for predictable connectivity and persistence
- Label resources for easier operations and cleanup
- Use restart policies that match the behavior of your containers
- Prefer non-root container images and set `user` when the image supports it

## Conclusion

You have successfully configured the Docker provider in OpenTofu. This approach lets you manage Docker images, containers, networks, and volumes alongside the rest of your infrastructure code. Combine Docker resources with other OpenTofu providers to build reproducible local, CI, or remote-host environments.
