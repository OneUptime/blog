# How to Create Docker Containers with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Infrastructure as Code, IaC, Container

Description: Learn how to create and manage Docker containers with environment variables, volume mounts, and port bindings using OpenTofu.

## Introduction

This guide covers How to Create Docker Containers with OpenTofu using OpenTofu with production-ready configurations, best practices, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Docker daemon
- Permission to connect to the Docker socket or remote Docker host

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.0"
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
  description = "Docker daemon address"
  type        = string
  default     = "unix:///var/run/docker.sock"
}

variable "container_name" {
  description = "Name of the Docker container"
  type        = string
  default     = "nginx-demo"
}

variable "environment" {
  description = "Container environment"
  type        = string
  default     = "production"
}

variable "container_image" {
  description = "Container image to run"
  type        = string
  default     = "nginx:1.27"
}

variable "host_port" {
  description = "Port exposed on the Docker host"
  type        = number
  default     = 8080
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 80
}

variable "volume_name" {
  description = "Name of the Docker volume"
  type        = string
  default     = "nginx-data"
}
```

## Step 3: Pull the Docker Image

```hcl
resource "docker_image" "app" {
  name         = var.container_image
  keep_locally = true
}
```

## Step 4: Create the Docker Volume

```hcl
resource "docker_volume" "app_data" {
  name = var.volume_name
}
```

## Step 5: Create the Container

```hcl
resource "docker_container" "app" {
  name  = var.container_name
  image = docker_image.app.image_id

  env = [
    "APP_ENV=${var.environment}",
    "LOG_LEVEL=info"
  ]

  ports {
    internal = var.container_port
    external = var.host_port
  }

  volumes {
    volume_name    = docker_volume.app_data.name
    container_path = "/app/data"
  }

  restart = "unless-stopped"
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

output "host_port" {
  value = docker_container.app.ports[0].external
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Pin provider and image versions for repeatable deployments
- Use named volumes when container data must persist across restarts
- Expose only the ports your application actually needs
- Pass configuration through variables and avoid hardcoding secrets in configuration
- Set a restart policy for long-running containers

## Conclusion

You have successfully configured How to Create Docker Containers with OpenTofu using OpenTofu. This approach lets you manage container images, volumes, and runtime settings alongside the rest of your infrastructure code. Combine these Docker resources with networks, multiple containers, or image builds for more advanced container workflows.
