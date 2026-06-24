# How to Build Docker Images with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Container, Infrastructure as Code, DevOps

Description: Learn how to build docker images with OpenTofu using the Docker provider for local and remote container management.

## Introduction

OpenTofu can use the Docker provider to build Docker images and manage containers declaratively. This is useful for local development environments, testing infrastructure, and managing Docker hosts in production.

## Provider Setup

```hcl
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}
```

Resource Configuration

```hcl
# Build the image

resource "docker_image" "app" {
  name         = "${var.image_name}:${var.image_tag}"

  build {
    context = "."
  }

  keep_locally = false
}

# Create the container
resource "docker_container" "app" {
  name  = var.container_name
  image = docker_image.app.image_id

  ports {
    internal = var.container_port
    external = var.host_port
  }

  env = [
    "APP_ENV=${var.environment}",
    "PORT=${var.container_port}",
  ]

  volumes {
    container_path = "/app/data"
    volume_name    = docker_volume.data.name
  }

  networks_advanced {
    name = docker_network.app.name
  }

  restart = "unless-stopped"
}

resource "docker_network" "app" {
  name   = "${var.app_name}-network"
  driver = "bridge"
}

resource "docker_volume" "data" {
  name = "${var.app_name}-data"
}
```

## Variables

```hcl
variable "app_name"       { type = string }
variable "image_name"     { type = string }
variable "image_tag"      { type = string; default = "latest" }
variable "container_name" { type = string }
variable "container_port" { type = number; default = 8080 }
variable "host_port"      { type = number; default = 8080 }
variable "environment"    { type = string; default = "development" }
```

## Conclusion

The Docker provider is excellent for managing local development environments and testing stacks. For production workloads, consider ECS, AKS, or GKE-but Docker provider is valuable for developer tooling, CI runners, and simple self-hosted services.
