# How to Docker Compose Stacks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Container, Infrastructure as Code, DevOps

Description: Learn how to docker compose stacks with OpenTofu using the Docker provider for local and remote container management.

## Introduction

The OpenTofu Docker provider manages Docker resources declaratively, such as images, containers, networks, and volumes. This is useful for local development environments, testing infrastructure, and managing local or remote Docker hosts.

## Provider Setup

```hcl
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "4.2.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}
```

Resource Configuration

```hcl
# Pull the image

resource "docker_image" "app" {
  name         = "${var.image_name}:${var.image_tag}"
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
variable "image_tag" {
  type    = string
  default = "latest"
}
variable "container_name" { type = string }
variable "container_port" {
  type    = number
  default = 8080
}
variable "host_port" {
  type    = number
  default = 8080
}
variable "environment" {
  type    = string
  default = "development"
}
```

## Conclusion

The Docker provider is excellent for managing local development environments and testing stacks. For production workloads, consider ECS, AKS, or GKE-but Docker provider is valuable for developer tooling, CI runners, and simple self-hosted services.
