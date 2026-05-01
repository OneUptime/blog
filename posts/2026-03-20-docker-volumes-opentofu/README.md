# How to Create Docker Volumes with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Infrastructure as Code, IaC, Docker Volumes, Storage

Description: Learn how to create and manage Docker volumes for persistent data storage with driver options using OpenTofu.

## Introduction

This guide covers how to create Docker volumes with OpenTofu using production-ready configurations, best practices, and practical examples.

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
      version = "~> 4.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}
```

## Step 2: Define Variables

```hcl
variable "volume_name" {
  description = "Name of the Docker volume"
  type        = string
  default     = "app-data"
}

variable "volume_driver" {
  description = "Docker volume driver"
  type        = string
  default     = "local"
}

variable "volume_driver_opts" {
  description = "Driver-specific options for the volume"
  type        = map(string)
  default     = {}
}

variable "container_name" {
  description = "Name of the demo container"
  type        = string
  default     = "volume-demo"
}

variable "container_image" {
  description = "Container image to run"
  type        = string
  default     = "nginx:1.27-alpine"
}

variable "container_mount_path" {
  description = "Path inside the container where the volume will be mounted"
  type        = string
  default     = "/usr/share/nginx/html"
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 80
}

variable "host_port" {
  description = "Port to publish on the Docker host"
  type        = number
  default     = 8080
}

variable "environment" {
  description = "Deployment environment label"
  type        = string
  default     = "production"
}
```

## Step 3: Create Core Docker Resources

```hcl
resource "docker_volume" "app_data" {
  name   = var.volume_name
  driver = var.volume_driver

  driver_opts = var.volume_driver_opts

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
resource "docker_image" "app" {
  name = var.container_image
}
```

## Step 5: Expose the Workload

```hcl
resource "docker_container" "app" {
  name  = var.container_name
  image = docker_image.app.image_id

  ports {
    internal = var.container_port
    external = var.host_port
  }

  volumes {
    container_path = var.container_mount_path
    volume_name    = docker_volume.app_data.name
  }
}
```

## Step 6: Define Outputs

```hcl
output "volume_name" {
  value = docker_volume.app_data.name
}

output "volume_mountpoint" {
  value = docker_volume.app_data.mountpoint
}

output "container_id" {
  value = docker_container.app.id
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Pin the Docker provider version and review release notes before upgrading
- Use named volumes for data that must survive container recreation
- Pass `driver_opts` only when the selected driver and host platform support them
- Label volumes so they are easier to identify and manage
- Back up important data before destroying a managed volume

## Conclusion

You have successfully configured Docker volumes with OpenTofu. This approach lets you manage the volume, driver options, and consuming containers as code so your Docker environments are reproducible and easier to maintain.
